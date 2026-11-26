jest.mock('../config/mysqlDatabase', () => ({
  getMysqlPool: jest.fn(),
}));

const { getMysqlPool } = require('../config/mysqlDatabase');
const {
  createClass,
  createSubject,
  deleteClass,
  deleteSubject,
  getClassStudents,
  listClasses,
} = require('./mysqlAcademicRepository');

describe('MySQL academic repository', () => {
  let connection;
  let pool;

  beforeEach(() => {
    connection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    pool = {
      getConnection: jest.fn().mockResolvedValue(connection),
      execute: jest.fn(),
    };
    getMysqlPool.mockReturnValue(pool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('lists only the requested school and maps class-teacher details', async () => {
    pool.execute
      .mockResolvedValueOnce([[
        {
          id: '0123456789abcdef01234567',
          school_id: '89abcdef0123456701234567',
          standard: '1',
          division: 'A',
          class_teacher_id: 'fedcba987654321001234567',
          teacher_id: 'fedcba987654321001234567',
          teacher_name: 'Teacher',
          teacher_email: 'teacher@example.com',
        },
      ]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const result = await listClasses({
      schoolId: '89abcdef0123456701234567',
      standard: '1',
      page: '1',
      limit: '10',
    });

    expect(pool.execute.mock.calls[0][1]).toEqual([
      '89abcdef0123456701234567',
      '1',
      10,
      0,
    ]);
    expect(result.classes[0]).toMatchObject({
      _id: '0123456789abcdef01234567',
      schoolId: '89abcdef0123456701234567',
      classTeacherId: {
        _id: 'fedcba987654321001234567',
        name: 'Teacher',
        email: 'teacher@example.com',
      },
    });
    expect(result.pagination).toEqual({ total: 1, pages: 1 });
  });

  test('creates a class and keeps the write in one transaction', async () => {
    connection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[
        {
          id: '0123456789abcdef01234567',
          school_id: '89abcdef0123456701234567',
          standard: '1',
          division: 'A',
          class_teacher_id: null,
        },
      ]]);

    const classData = await createClass({
      schoolId: '89abcdef0123456701234567',
      standard: '1',
      division: 'A',
      academicYear: '2026',
    });

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(classData).toMatchObject({ standard: '1', division: 'A' });
  });

  test('creates a subject and its lecture configuration atomically', async () => {
    connection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    pool.execute
      .mockResolvedValueOnce([[
        {
          id: '0123456789abcdef01234567',
          school_id: '89abcdef0123456701234567',
          name: 'Mathematics',
          code: 'MATH',
          max_marks: 100,
          min_marks: 35,
        },
      ]])
      .mockResolvedValueOnce([[
        {
          subject_id: '0123456789abcdef01234567',
          standard: '1',
          weekly_lectures: 5,
          lecture_duration: '60',
          total_portion_lectures: 40,
          weightage: 1,
        },
      ]])
      .mockResolvedValueOnce([[]]);

    const subject = await createSubject({
      schoolId: '89abcdef0123456701234567',
      data: {
        name: 'Mathematics',
        code: 'MATH',
        lecturesPerStandard: [{ standard: '1', weeklyLectures: 5 }],
      },
    });

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.execute).toHaveBeenCalledTimes(2);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(subject).toMatchObject({
      _id: '0123456789abcdef01234567',
      name: 'Mathematics',
      lecturesPerStandard: [{ standard: '1', weeklyLectures: 5 }],
    });
  });

  test('does not expose student credentials in class listings', async () => {
    pool.execute
      .mockResolvedValueOnce([[{ id: 'class-id' }]])
      .mockResolvedValueOnce([[
        {
          id: 'student-id',
          school_id: 'school-id',
          name: 'Student',
          password: 'hashed-password',
          password_reset_token: 'reset-token',
        },
      ]]);

    const result = await getClassStudents({
      schoolId: 'school-id',
      classId: 'class-id',
    });

    expect(result.students).toHaveLength(1);
    expect(result.students[0]).toMatchObject({
      _id: 'student-id',
      name: 'Student',
    });
    expect(result.students[0]).not.toHaveProperty('password');
    expect(result.students[0]).not.toHaveProperty('passwordResetToken');
  });

  test('refuses to delete a class while homework depends on it', async () => {
    pool.execute.mockResolvedValueOnce([[{ id: 'class-id' }]]);
    connection.execute
      .mockResolvedValueOnce([[
        { id: 'class-id', standard: '1', division: 'A' },
      ]])
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    await expect(deleteClass({
      schoolId: 'school-id',
      classId: 'class-id',
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('homework or timetables'),
    });

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('refuses to delete a subject while attendance depends on it', async () => {
    connection.execute
      .mockResolvedValueOnce([[{ id: 'subject-id' }]])
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    await expect(deleteSubject({
      schoolId: 'school-id',
      subjectId: 'subject-id',
    })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Subject cannot be deleted while attendance records reference it.',
    });

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });
});
