const crypto = require('crypto');
const { getMysqlPool } = require('../config/mysqlDatabase');

const userTables = {
  admin: { table: 'users', model: 'User' },
  teacher: { table: 'teachers', model: 'Teacher' },
  student: { table: 'students', model: 'Student' },
  family: { table: 'families', model: 'Family' },
};

const normalizeSchoolCode = (code) =>
  typeof code === 'string' ? code.trim().toUpperCase() : '';

const mapSchool = (row, admin) => ({
  _id: row.id,
  name: row.name,
  code: row.code,
  adminId: admin || row.admin_id,
  email: row.email,
  phone: row.phone,
  address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address,
  logo: row.logo,
  website: row.website,
  principalName: row.principal_name,
  principalEmail: row.principal_email,
  studentCount: row.student_count,
  teacherCount: row.teacher_count,
  classCount: row.class_count,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapUser = (row) => ({
  _id: row.id,
  schoolId: row.school_id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  avatar: row.avatar,
  isActive: Boolean(row.is_active),
  lastLogin: row.last_login,
});

const mapProfileRow = (row) => {
  const profile = {};
  for (const [column, value] of Object.entries(row)) {
    if (['password', 'password_reset_token', 'password_reset_expires'].includes(column)) {
      continue;
    }

    const field = column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (column === 'id') {
      profile._id = value;
    } else if (column === 'school_id') {
      profile.schoolId = value;
    } else if (value !== null && typeof value === 'string' && /^[\[{]/.test(value)) {
      try {
        profile[field] = JSON.parse(value);
      } catch {
        profile[field] = value;
      }
    } else {
      profile[field] = value;
    }
  }
  profile.isActive = Boolean(row.is_active);
  return profile;
};

const getUserTable = (role) => {
  const userTable = userTables[role];
  if (!userTable) {
    throw new Error(`Unsupported user role: ${role}`);
  }
  return userTable;
};

const getSchoolById = async (schoolId) => {
  const pool = getMysqlPool();
  const [schools] = await pool.execute(
    'SELECT * FROM schools WHERE id = ? LIMIT 1',
    [schoolId]
  );
  if (schools.length === 0) return null;

  const school = schools[0];
  const [admins] = await pool.execute(
    'SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1',
    [school.admin_id]
  );
  const admin = admins.length > 0
    ? {
        _id: admins[0].id,
        name: admins[0].name,
        email: admins[0].email,
        phone: admins[0].phone,
      }
    : null;

  return mapSchool(school, admin);
};

const listSchools = async ({ page, limit, search }) => {
  const pool = getMysqlPool();
  const offset = (page - 1) * limit;
  const searchTerm = search ? `%${search}%` : null;
  const whereSql = search
    ? 'WHERE name LIKE ? OR code LIKE ?'
    : '';
  const whereParams = search ? [searchTerm, searchTerm] : [];
  const [rows] = await pool.execute(
    `SELECT * FROM schools ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...whereParams, limit, offset]
  );
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM schools ${whereSql}`,
    whereParams
  );

  const schools = await Promise.all(rows.map(async (row) => {
    const [admins] = await pool.execute(
      'SELECT id, name, email FROM users WHERE id = ? LIMIT 1',
      [row.admin_id]
    );
    return mapSchool(row, admins.length > 0
      ? { _id: admins[0].id, name: admins[0].name, email: admins[0].email }
      : null);
  }));
  const total = Number(countRows[0]?.total || 0);

  return { schools, total };
};

const updateSchoolById = async (schoolId, updates) => {
  const columnByField = {
    name: 'name',
    code: 'code',
    email: 'email',
    phone: 'phone',
    address: 'address',
    logo: 'logo',
    website: 'website',
    principalName: 'principal_name',
    principalEmail: 'principal_email',
    studentCount: 'student_count',
    teacherCount: 'teacher_count',
    classCount: 'class_count',
    isActive: 'is_active',
  };
  const entries = Object.entries(columnByField)
    .filter(([field]) => Object.prototype.hasOwnProperty.call(updates, field)
      && updates[field] !== undefined)
    .map(([field, column]) => [column, field, updates[field]]);

  if (entries.length > 0) {
    const setClause = entries.map(([column]) => `\`${column}\` = ?`).join(', ');
    const values = entries.map(([, field, value]) =>
      field === 'address' && value !== null ? JSON.stringify(value) : value
    );
    await getMysqlPool().execute(
      `UPDATE schools SET ${setClause}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [...values, schoolId]
    );
  }

  return getSchoolById(schoolId);
};

const getSchoolStats = async (schoolId) => {
  const pool = getMysqlPool();
  const [
    [studentRows],
    [teacherRows],
    [classRows],
    [subjectRows],
    [attendanceRows],
    [pendingComplaintRows],
    [todayAttendanceRows],
  ] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM students WHERE school_id = ?', [schoolId]),
    pool.execute('SELECT COUNT(*) AS total FROM teachers WHERE school_id = ?', [schoolId]),
    pool.execute('SELECT COUNT(*) AS total FROM classes WHERE school_id = ?', [schoolId]),
    pool.execute('SELECT COUNT(*) AS total FROM subjects WHERE school_id = ?', [schoolId]),
    pool.execute('SELECT COUNT(*) AS total FROM attendance WHERE school_id = ?', [schoolId]),
    pool.execute(
      "SELECT COUNT(*) AS total FROM complaints WHERE school_id = ? AND status = 'Pending'",
      [schoolId]
    ),
    pool.execute(
      'SELECT COUNT(*) AS total FROM attendance WHERE school_id = ? AND date >= CURRENT_DATE() AND date < CURRENT_DATE() + INTERVAL 1 DAY',
      [schoolId]
    ),
  ]);
  const count = (rows) => Number(rows[0]?.total || 0);

  return {
    totalStudents: count(studentRows),
    totalTeachers: count(teacherRows),
    totalClasses: count(classRows),
    totalSubjects: count(subjectRows),
    totalAttendance: count(attendanceRows),
    pendingComplaints: count(pendingComplaintRows),
    todayAttendance: count(todayAttendanceRows),
  };
};

const createSchoolAndAdmin = async ({
  name,
  code,
  email,
  phone,
  address,
  principalName,
  principalEmail,
  adminName,
  adminEmail,
  adminPassword,
}) => {
  const normalizedCode = normalizeSchoolCode(code);
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAdminEmail = adminEmail.trim().toLowerCase();
  const pool = getMysqlPool();
  const connection = await pool.getConnection();
  const schoolId = crypto.randomBytes(12).toString('hex');
  const adminId = crypto.randomBytes(12).toString('hex');
  const now = new Date();

  try {
    await connection.beginTransaction();

    const [existingSchools] = await connection.execute(
      'SELECT id FROM schools WHERE LOWER(code) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
      [normalizedCode, normalizedEmail]
    );
    if (existingSchools.length > 0) {
      const error = new Error('School with this code or email already exists');
      error.code = 'SCHOOL_ALREADY_EXISTS';
      throw error;
    }

    await connection.execute(
      `INSERT INTO schools
        (id, name, code, admin_id, email, phone, address, principal_name, principal_email, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [
        schoolId,
        name.trim(),
        normalizedCode,
        adminId,
        normalizedEmail,
        phone,
        address ? JSON.stringify(address) : null,
        principalName || adminName || name,
        principalEmail || normalizedAdminEmail,
        now,
        now,
      ]
    );

    await connection.execute(
      `INSERT INTO users
        (id, school_id, name, email, password, phone, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'admin', TRUE, ?, ?)`,
      [
        adminId,
        schoolId,
        adminName.trim(),
        normalizedAdminEmail,
        adminPassword,
        phone || null,
        now,
        now,
      ]
    );

    await connection.commit();

    return {
      school: {
        _id: schoolId,
        name: name.trim(),
        code: normalizedCode,
        adminId,
        email: normalizedEmail,
        phone,
        address: address || null,
        principalName: principalName || adminName || name,
        principalEmail: principalEmail || normalizedAdminEmail,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      admin: {
        id: adminId,
        email: normalizedAdminEmail,
        name: adminName.trim(),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const findLoginAccount = async (email, schoolCode) => {
  const pool = getMysqlPool();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = normalizeSchoolCode(schoolCode);
  const [schools] = await pool.execute(
    'SELECT * FROM schools WHERE LOWER(code) = LOWER(?) LIMIT 1',
    [normalizedCode]
  );
  if (schools.length === 0) return { school: null, account: null };

  const school = schools[0];
  const accountQueries = Object.entries(userTables);
  let account = null;
  for (const [role, { table }] of accountQueries) {
    const [rows] = await pool.execute(
      `SELECT id, school_id, name, email, password, phone, role, avatar, is_active, last_login
       FROM ${table}
       WHERE LOWER(email) = LOWER(?) AND school_id = ?
       LIMIT 1`,
      [normalizedEmail, school.id]
    );
    if (rows.length > 0) {
      account = rows[0];
      account.role = account.role || role;
      break;
    }
  }
  if (!account) {
    return { school: mapSchool(school, null), account: null };
  }

  const [adminRows] = await pool.execute(
    'SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1',
    [school.admin_id]
  );

  return {
    account,
    school: mapSchool(school, adminRows.length > 0
      ? {
          _id: adminRows[0].id,
          name: adminRows[0].name,
          email: adminRows[0].email,
          phone: adminRows[0].phone,
        }
      : null),
  };
};

const createLoginSession = async ({ userId, role, refreshToken }) => {
  const userTable = getUserTable(role);

  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE ${userTable.table} SET last_login = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [userId]
    );
    await connection.execute(
      `DELETE FROM refresh_tokens
       WHERE user_id = ? AND user_model = ?
         AND created_at < DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY)`,
      [userId, userTable.model]
    );
    await connection.execute(
      'INSERT INTO refresh_tokens (user_id, user_model, token, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))',
      [userId, userTable.model, refreshToken]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const rotateLoginSession = async ({ userId, role, currentToken, nextToken }) => {
  const userTable = getUserTable(role);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const [deleteResult] = await connection.execute(
      `DELETE FROM refresh_tokens
       WHERE user_id = ? AND user_model = ? AND token = ?
         AND created_at >= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY)`,
      [userId, userTable.model, currentToken]
    );
    if (deleteResult.affectedRows !== 1) {
      await connection.rollback();
      return null;
    }

    const [userRows] = await connection.execute(
      `SELECT id, school_id, name, email, phone, role, avatar, is_active, last_login
       FROM ${userTable.table} WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (userRows.length === 0) {
      await connection.rollback();
      return null;
    }

    await connection.execute(
      'INSERT INTO refresh_tokens (user_id, user_model, token, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))',
      [userId, userTable.model, nextToken]
    );
    await connection.commit();
    return userRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const revokeLoginSession = async ({ userId, role, refreshToken }) => {
  const userTable = getUserTable(role);
  if (!refreshToken) return;
  await getMysqlPool().execute(
    'DELETE FROM refresh_tokens WHERE user_id = ? AND user_model = ? AND token = ?',
    [userId, userTable.model, refreshToken]
  );
};

const getUserById = async ({ userId, role, includePassword = false }) => {
  const userTable = getUserTable(role);
  const fields = includePassword
    ? '*'
    : 'id, school_id, name, email, phone, role, avatar, is_active, last_login';
  const [rows] = await getMysqlPool().execute(
    `SELECT ${fields} FROM ${userTable.table} WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const getUserProfile = async ({ userId, role }) => {
  const row = await getUserById({ userId, role, includePassword: true });
  if (!row) return null;
  const profile = mapProfileRow(row);
  profile.schoolId = await getSchoolById(row.school_id);

  if (role === 'student') {
    if (row.class_id) {
      const [classes] = await getMysqlPool().execute(
        'SELECT * FROM classes WHERE id = ? LIMIT 1',
        [row.class_id]
      );
      profile.classId = classes.length > 0 ? mapProfileRow(classes[0]) : null;
    }
    const [subjects] = await getMysqlPool().execute(
      `SELECT subjects.* FROM subjects
       INNER JOIN student_subjects ON student_subjects.subject_id = subjects.id
       WHERE student_subjects.student_id = ?`,
      [userId]
    );
    profile.subjectsEnrolled = subjects.map(mapProfileRow);
  } else if (role === 'teacher') {
    if (row.class_teacher_of) {
      const [classes] = await getMysqlPool().execute(
        'SELECT * FROM classes WHERE id = ? LIMIT 1',
        [row.class_teacher_of]
      );
      profile.classTeacherOf = classes.length > 0 ? mapProfileRow(classes[0]) : null;
    }

    const [subjects] = await getMysqlPool().execute(
      `SELECT subjects.* FROM subjects
       INNER JOIN teacher_subjects ON teacher_subjects.subject_id = subjects.id
       WHERE teacher_subjects.teacher_id = ?`,
      [userId]
    );
    profile.subjectIds = subjects.map(mapProfileRow);

    const [classes] = await getMysqlPool().execute(
      `SELECT classes.* FROM classes
       INNER JOIN teacher_classes ON teacher_classes.class_id = classes.id
       WHERE teacher_classes.teacher_id = ?`,
      [userId]
    );
    profile.classIds = classes.map((item) => item.id);

    const [assignments] = await getMysqlPool().execute(
      `SELECT subjects.id AS subject_id, subjects.name AS subject_name,
              subjects.code AS subject_code, subjects.standard AS subject_standard,
              classes.id AS class_id, classes.standard AS class_standard,
              classes.division AS class_division
       FROM teacher_subject_class_assignments assignments
       INNER JOIN subjects ON subjects.id = assignments.subject_id
       INNER JOIN classes ON classes.id = assignments.class_id
       WHERE assignments.teacher_id = ?`,
      [userId]
    );
    profile.subjectClassAssignments = assignments.map((assignment) => ({
      subjectId: {
        _id: assignment.subject_id,
        name: assignment.subject_name,
        code: assignment.subject_code,
        standard: assignment.subject_standard,
      },
      classId: {
        _id: assignment.class_id,
        standard: assignment.class_standard,
        division: assignment.class_division,
      },
    }));

    const [standardRows] = await getMysqlPool().execute(
      `SELECT subject_id, standard FROM teacher_assigned_standards
       WHERE teacher_id = ? ORDER BY id`,
      [userId]
    );
    const standardsBySubject = new Map();
    for (const item of standardRows) {
      if (!standardsBySubject.has(item.subject_id)) {
        standardsBySubject.set(item.subject_id, []);
      }
      standardsBySubject.get(item.subject_id).push(item.standard);
    }
    profile.assignedSubjectStandards = Array.from(standardsBySubject, ([subjectId, standards]) => ({
      subjectId,
      standards,
    }));
  } else if (role === 'family') {
    const [children] = await getMysqlPool().execute(
      `SELECT family_children.student_id, family_children.relation,
              family_children.student_name, family_children.student_class,
              family_children.admission_number, family_children.status,
              students.name AS linked_student_name, students.class_id,
              students.division, students.roll_number
       FROM family_children
       LEFT JOIN students ON students.id = family_children.student_id
       WHERE family_children.family_id = ?
       ORDER BY family_children.position`,
      [userId]
    );
    profile.children = children.map((child) => ({
      studentId: child.linked_student_name
        ? {
            _id: child.student_id,
            name: child.linked_student_name,
            classId: child.class_id,
            division: child.division,
            admissionNumber: child.admission_number,
            rollNumber: child.roll_number,
          }
        : child.student_id,
      relation: child.relation,
      studentName: child.student_name,
      studentClass: child.student_class,
      admissionNumber: child.admission_number,
      status: child.status,
    }));
    const [responsibilities] = await getMysqlPool().execute(
      'SELECT responsibility FROM family_responsibilities WHERE family_id = ? ORDER BY position',
      [userId]
    );
    profile.responsibilities = responsibilities.map((item) => item.responsibility);
  }

  return profile;
};

const updateUserProfile = async ({ userId, role, name, phone, avatar }) => {
  const userTable = getUserTable(role);
  const entries = [
    ['name', name],
    ['phone', phone],
    ['avatar', avatar],
  ].filter(([, value]) => value !== undefined);
  if (entries.length > 0) {
    const setClause = entries.map(([column]) => `\`${column}\` = ?`).join(', ');
    await getMysqlPool().execute(
      `UPDATE ${userTable.table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [...entries.map(([, value]) => value), userId]
    );
  }
  return mapUser(await getUserById({ userId, role }));
};

const updateUserPassword = async ({ userId, role, password }) => {
  const userTable = getUserTable(role);
  const [result] = await getMysqlPool().execute(
    `UPDATE ${userTable.table}
     SET password = ?, password_changed_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [password, userId]
  );
  return result.affectedRows === 1;
};

const findPasswordResetAccount = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  for (const [role, userTable] of Object.entries(userTables)) {
    const [rows] = await getMysqlPool().execute(
      `SELECT id, school_id, name, email, role FROM ${userTable.table}
       WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [normalizedEmail]
    );
    if (rows.length > 0) return { ...rows[0], role };
  }
  return null;
};

const setPasswordResetCode = async ({ email, code, expiresAt }) => {
  const account = await findPasswordResetAccount(email);
  if (!account) return null;
  const userTable = getUserTable(account.role);
  await getMysqlPool().execute(
    `UPDATE ${userTable.table} SET password_reset_token = ?, password_reset_expires = ?
     WHERE id = ?`,
    [code, expiresAt, account.id]
  );
  return account;
};

const verifyPasswordResetCode = async ({ email, code }) => {
  const account = await findPasswordResetAccount(email);
  if (!account) return { account: null, valid: false };
  const userTable = getUserTable(account.role);
  const [rows] = await getMysqlPool().execute(
    `SELECT id FROM ${userTable.table}
     WHERE id = ? AND password_reset_token = ? AND password_reset_expires > CURRENT_TIMESTAMP(3)
     LIMIT 1`,
    [account.id, code]
  );
  return { account, valid: rows.length > 0 };
};

const completePasswordReset = async ({ email, code, password }) => {
  const { account, valid } = await verifyPasswordResetCode({ email, code });
  if (!valid || !account) return false;
  const userTable = getUserTable(account.role);
  const [result] = await getMysqlPool().execute(
    `UPDATE ${userTable.table}
     SET password = ?, password_reset_token = NULL, password_reset_expires = NULL,
         password_changed_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = ? AND password_reset_token = ?`,
    [password, account.id, code]
  );
  return result.affectedRows === 1;
};

module.exports = {
  createLoginSession,
  createSchoolAndAdmin,
  completePasswordReset,
  findLoginAccount,
  findPasswordResetAccount,
  getSchoolById,
  getSchoolStats,
  getUserById,
  getUserProfile,
  listSchools,
  mapUser,
  mapProfileRow,
  normalizeSchoolCode,
  revokeLoginSession,
  rotateLoginSession,
  setPasswordResetCode,
  updateSchoolById,
  updateUserPassword,
  updateUserProfile,
  verifyPasswordResetCode,
};
