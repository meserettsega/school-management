jest.mock('../config/mysqlDatabase', () => ({
  getMysqlPool: jest.fn(),
}));

const { getMysqlPool } = require('../config/mysqlDatabase');
const {
  createSchoolAndAdmin,
  findLoginAccount,
  getUserProfile,
  mapUser,
  normalizeSchoolCode,
  rotateLoginSession,
} = require('./mysqlAuthRepository');

describe('MySQL auth repository', () => {
  let connection;

  beforeEach(() => {
    connection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    getMysqlPool.mockReturnValue({
      getConnection: jest.fn().mockResolvedValue(connection),
      execute: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes school codes and maps SQL fields to the API shape', () => {
    expect(normalizeSchoolCode('  ab-123 ')).toBe('AB-123');
    expect(mapUser({
      id: '0123456789abcdef01234567',
      school_id: '89abcdef0123456701234567',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      is_active: 1,
    })).toMatchObject({
      _id: '0123456789abcdef01234567',
      schoolId: '89abcdef0123456701234567',
      isActive: true,
    });
  });

  test('finds an account by case-insensitive school code and email', async () => {
    const pool = getMysqlPool();
    pool.execute
      .mockResolvedValueOnce([[{
        id: '89abcdef0123456701234567',
        code: 'EX-1',
        admin_id: '0123456789abcdef01234567',
        address: '{"city":"Test"}',
        is_active: 1,
      }]])
      .mockResolvedValueOnce([[{
        id: '0123456789abcdef01234567',
        school_id: '89abcdef0123456701234567',
        name: 'Admin',
        email: 'admin@example.com',
        password: 'hashed',
        role: 'admin',
        is_active: 1,
      }]])
      .mockResolvedValueOnce([[{
        id: '0123456789abcdef01234567',
        name: 'Admin',
        email: 'admin@example.com',
        phone: '555-0100',
      }]]);

    const result = await findLoginAccount('ADMIN@example.com', ' ex-1 ');

    expect(pool.execute.mock.calls[0][1]).toEqual(['EX-1']);
    expect(pool.execute.mock.calls[1][1]).toEqual([
      'admin@example.com',
      '89abcdef0123456701234567',
    ]);
    expect(result.account.role).toBe('admin');
    expect(result.school.address).toEqual({ city: 'Test' });
    expect(result.school.adminId).toMatchObject({ name: 'Admin' });
  });

  test('creates a school and administrator in one transaction', async () => {
    connection.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const result = await createSchoolAndAdmin({
      name: 'Example School',
      code: ' ex-1 ',
      email: 'SCHOOL@example.com',
      phone: '555-0100',
      adminName: 'School Admin',
      adminEmail: 'ADMIN@example.com',
      adminPassword: 'hashed-password',
    });

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.execute).toHaveBeenCalledTimes(3);
    expect(connection.execute.mock.calls[0][1]).toEqual(['EX-1', 'school@example.com']);
    expect(connection.execute.mock.calls[2][1]).toContain('admin@example.com');
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(result.school.code).toBe('EX-1');
    expect(result.admin.email).toBe('admin@example.com');
  });

  test('rolls back when school code or email already exists', async () => {
    connection.execute.mockResolvedValueOnce([[{ id: 'existing' }]]);

    await expect(createSchoolAndAdmin({
      name: 'Example School',
      code: 'EX-1',
      email: 'school@example.com',
      phone: '555-0100',
      adminName: 'School Admin',
      adminEmail: 'admin@example.com',
      adminPassword: 'hashed-password',
    })).rejects.toMatchObject({ code: 'SCHOOL_ALREADY_EXISTS' });

    expect(connection.execute).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('atomically replaces a valid refresh token', async () => {
    connection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[
        {
          id: '0123456789abcdef01234567',
          school_id: '89abcdef0123456701234567',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
        },
      ]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const user = await rotateLoginSession({
      userId: '0123456789abcdef01234567',
      role: 'admin',
      currentToken: 'old-token',
      nextToken: 'new-token',
    });

    expect(connection.execute).toHaveBeenCalledTimes(3);
    expect(connection.execute.mock.calls[0][1]).toEqual([
      '0123456789abcdef01234567',
      'User',
      'old-token',
    ]);
    expect(connection.execute.mock.calls[2][1]).toEqual([
      '0123456789abcdef01234567',
      'User',
      'new-token',
    ]);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(user.role).toBe('admin');
  });

  test('rejects and rolls back an already-used refresh token', async () => {
    connection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const user = await rotateLoginSession({
      userId: '0123456789abcdef01234567',
      role: 'admin',
      currentToken: 'used-token',
      nextToken: 'new-token',
    });

    expect(user).toBeNull();
    expect(connection.execute).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('returns a student profile with its class and enrolled subjects', async () => {
    const pool = getMysqlPool();
    pool.execute
      .mockResolvedValueOnce([[
        {
          id: '0123456789abcdef01234567',
          school_id: '89abcdef0123456701234567',
          class_id: 'abcdef012345678901234567',
          name: 'Student',
          email: 'student@example.com',
          password: 'hashed',
          role: 'student',
          is_active: 1,
        },
      ]])
      .mockResolvedValueOnce([[
        {
          id: '89abcdef0123456701234567',
          admin_id: 'fedcba987654321001234567',
          name: 'Example School',
          code: 'EX-1',
          is_active: 1,
        },
      ]])
      .mockResolvedValueOnce([[
        {
          id: 'fedcba987654321001234567',
          name: 'Admin',
          email: 'admin@example.com',
        },
      ]])
      .mockResolvedValueOnce([[
        {
          id: 'abcdef012345678901234567',
          standard: '1',
          division: 'A',
        },
      ]])
      .mockResolvedValueOnce([[
        {
          id: '1234567890abcdef12345678',
          name: 'Mathematics',
          code: 'MATH',
        },
      ]]);

    const profile = await getUserProfile({
      userId: '0123456789abcdef01234567',
      role: 'student',
    });

    expect(profile.schoolId).toMatchObject({ name: 'Example School' });
    expect(profile.classId).toMatchObject({ standard: '1', division: 'A' });
    expect(profile.subjectsEnrolled).toHaveLength(1);
    expect(profile.subjectsEnrolled[0].name).toBe('Mathematics');
    expect(profile.password).toBeUndefined();
  });
});
