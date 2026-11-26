const crypto = require('crypto');
const { getMysqlPool } = require('../config/mysqlDatabase');

const numericColumns = new Set([
  'capacity',
  'student_count',
  'max_marks',
  'min_marks',
  'default_weekly_lectures',
  'weightage',
]);

const mapRow = (row) => {
  const mapped = {};
  for (const [column, value] of Object.entries(row)) {
    if (['password', 'password_reset_token', 'password_reset_expires'].includes(column)) {
      continue;
    }
    const field = column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (column === 'id') {
      mapped._id = value;
    } else if (numericColumns.has(column) && value !== null) {
      mapped[field] = Number(value);
    } else if (value !== null && typeof value === 'string' && /^[\[{]/.test(value)) {
      try {
        mapped[field] = JSON.parse(value);
      } catch {
        mapped[field] = value;
      }
    } else {
      mapped[field] = value;
    }
  }
  return mapped;
};

const createId = () => crypto.randomBytes(12).toString('hex');
const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const conflict = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const withTransaction = async (operation) => {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const mapClassRow = (row) => {
  const classData = mapRow(row);
  classData.classTeacherId = row.teacher_id
    ? {
        _id: row.teacher_id,
        name: row.teacher_name,
        email: row.teacher_email,
        ...(row.teacher_phone === undefined ? {} : { phone: row.teacher_phone }),
      }
    : row.class_teacher_id || null;
  return classData;
};

const findClassRows = async (schoolId, classId) => {
  const [rows] = await getMysqlPool().execute(
    `SELECT classes.*, teachers.id AS teacher_id, teachers.name AS teacher_name,
            teachers.email AS teacher_email, teachers.phone AS teacher_phone,
            schools.id AS school_id, schools.name AS school_name,
            schools.code AS school_code, schools.email AS school_email
     FROM classes
     LEFT JOIN teachers ON teachers.id = classes.class_teacher_id
       AND teachers.school_id = classes.school_id
     LEFT JOIN schools ON schools.id = classes.school_id
     WHERE classes.school_id = ? AND classes.id = ?
     LIMIT 1`,
    [schoolId, classId]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  const classData = mapClassRow(row);
  classData.schoolId = {
    _id: row.school_id,
    name: row.school_name,
    code: row.school_code,
    email: row.school_email,
  };
  return classData;
};

const replicateExamsForClass = async (connection, schoolId, classData) => {
  const [rows] = await connection.execute(
    `SELECT exams.* FROM exams
     INNER JOIN classes ON classes.id = exams.class_id
     WHERE exams.school_id = ? AND classes.school_id = ?
       AND classes.standard = ? AND classes.id <> ?
     ORDER BY exams.created_at ASC`,
    [schoolId, schoolId, classData.standard, classData.id]
  );
  const examsByName = new Map();
  for (const exam of rows) {
    if (!examsByName.has(exam.name)) examsByName.set(exam.name, exam);
  }

  for (const exam of examsByName.values()) {
    await connection.execute(
      `INSERT INTO exams
        (id, school_id, name, class_id, subject_id, date, start_time, end_time,
         total_marks, passing_marks, duration, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      [
        createId(),
        schoolId,
        exam.name,
        classData.id,
        exam.subject_id,
        exam.date,
        exam.start_time,
        exam.end_time,
        exam.total_marks,
        exam.passing_marks,
        exam.duration,
      ]
    );
  }
};

const listClasses = async ({ schoolId, standard, page, limit }) => {
  const safePage = parsePositiveInteger(page, 1);
  const safeLimit = parsePositiveInteger(limit, 10);
  const offset = (safePage - 1) * safeLimit;
  const whereSql = standard ? 'AND classes.standard = ?' : '';
  const params = standard ? [schoolId, standard] : [schoolId];
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT classes.*, teachers.id AS teacher_id, teachers.name AS teacher_name,
            teachers.email AS teacher_email
     FROM classes
     LEFT JOIN teachers ON teachers.id = classes.class_teacher_id
       AND teachers.school_id = classes.school_id
     WHERE classes.school_id = ? ${whereSql}
     ORDER BY classes.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM classes WHERE school_id = ? ${standard ? 'AND standard = ?' : ''}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);
  return {
    classes: rows.map(mapClassRow),
    pagination: { total, pages: Math.ceil(total / safeLimit) },
  };
};

const createClass = async ({ schoolId, standard, division, academicYear }) => {
  if (!standard || !division) {
    const error = new Error('Standard and division are required');
    error.statusCode = 400;
    throw error;
  }

  return withTransaction(async (connection) => {
    const id = createId();
    const classData = {
      id,
      standard: String(standard),
      division: String(division),
    };
    await connection.execute(
      `INSERT INTO classes
        (id, school_id, standard, division, academic_year, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      [id, schoolId, classData.standard, classData.division, academicYear || new Date().getFullYear().toString()]
    );
    await replicateExamsForClass(connection, schoolId, classData);
    return getClassRowsUsingConnection(connection, schoolId, id);
  });
};

const getClassRowsUsingConnection = async (connection, schoolId, classId) => {
  const [rows] = await connection.execute(
    `SELECT classes.*, teachers.id AS teacher_id, teachers.name AS teacher_name,
            teachers.email AS teacher_email, teachers.phone AS teacher_phone
     FROM classes
     LEFT JOIN teachers ON teachers.id = classes.class_teacher_id
       AND teachers.school_id = classes.school_id
     WHERE classes.school_id = ? AND classes.id = ?
     LIMIT 1`,
    [schoolId, classId]
  );
  return rows.length > 0 ? mapClassRow(rows[0]) : null;
};

const updateClass = async ({ schoolId, classId, updates }) => {
  const columns = {
    standard: 'standard',
    division: 'division',
    classTeacherId: 'class_teacher_id',
    capacity: 'capacity',
    studentCount: 'student_count',
    room: 'room',
    academicYear: 'academic_year',
  };
  const entries = Object.entries(columns)
    .filter(([field]) => Object.prototype.hasOwnProperty.call(updates, field)
      && updates[field] !== undefined)
    .map(([field, column]) => [column, updates[field]]);

  for (const field of ['standard', 'division']) {
    if (Object.prototype.hasOwnProperty.call(updates, field)
        && (typeof updates[field] !== 'string' || updates[field].trim() === '')) {
      const error = new Error(`${field} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'classTeacherId') && updates.classTeacherId) {
    const [teachers] = await getMysqlPool().execute(
      'SELECT id FROM teachers WHERE id = ? AND school_id = ? LIMIT 1',
      [updates.classTeacherId, schoolId]
    );
    if (teachers.length === 0) {
      const error = new Error('Class teacher not found in this school');
      error.statusCode = 404;
      throw error;
    }
  }

  if (entries.length > 0) {
    await getMysqlPool().execute(
      `UPDATE classes SET ${entries.map(([column]) => `\`${column}\` = ?`).join(', ')},
       updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND school_id = ?`,
      [...entries.map(([, value]) => value === '' ? null : value), classId, schoolId]
    );
  }
  return findClassRows(schoolId, classId);
};

const getClassStudents = async ({ schoolId, classId }) => {
  const [classes] = await getMysqlPool().execute(
    'SELECT id FROM classes WHERE id = ? AND school_id = ? LIMIT 1',
    [classId, schoolId]
  );
  if (classes.length === 0) return null;
  const [rows] = await getMysqlPool().execute(
    `SELECT * FROM students WHERE class_id = ? AND school_id = ?
     ORDER BY last_name ASC, first_name ASC`,
    [classId, schoolId]
  );
  return { students: rows.map(mapRow), totalStudents: rows.length };
};

const bulkSetupClasses = async ({ schoolId, classesConfig }) => {
  if (!Array.isArray(classesConfig)) {
    const error = new Error('classesConfig is required and must be an array');
    error.statusCode = 400;
    throw error;
  }

  await withTransaction(async (connection) => {
    for (const config of classesConfig) {
      if (config.standard === undefined || config.standard === null || String(config.standard).trim() === '') {
        const error = new Error('Each class configuration must include a standard');
        error.statusCode = 400;
        throw error;
      }
      const standard = String(config.standard);
      const divisionCount = parsePositiveInteger(config.divisionsCount, 1);
      if (divisionCount > 26) {
        const error = new Error('A standard cannot have more than 26 divisions');
        error.statusCode = 400;
        throw error;
      }

      for (let index = 0; index < divisionCount; index += 1) {
        const division = String.fromCharCode(65 + index);
        const [existing] = await connection.execute(
          'SELECT id FROM classes WHERE school_id = ? AND standard = ? AND division = ? LIMIT 1',
          [schoolId, standard, division]
        );
        if (existing.length > 0) continue;

        const id = createId();
        await connection.execute(
          `INSERT INTO classes
            (id, school_id, standard, division, academic_year, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
          [id, schoolId, standard, division, new Date().getFullYear().toString()]
        );
        await replicateExamsForClass(connection, schoolId, { id, standard });
      }
    }
  });

  const [rows] = await getMysqlPool().execute(
    `SELECT classes.*, teachers.id AS teacher_id, teachers.name AS teacher_name,
            teachers.email AS teacher_email
     FROM classes
     LEFT JOIN teachers ON teachers.id = classes.class_teacher_id
       AND teachers.school_id = classes.school_id
     WHERE classes.school_id = ?
     ORDER BY classes.standard, classes.division`,
    [schoolId]
  );
  return rows.map(mapClassRow);
};

const deleteClasses = async ({ schoolId, classIds, transferStudents }) => withTransaction(async (connection) => {
  const placeholders = classIds.map(() => '?').join(', ');
  const [classes] = await connection.execute(
    `SELECT * FROM classes WHERE school_id = ? AND id IN (${placeholders}) FOR UPDATE`,
    [schoolId, ...classIds]
  );
  if (classes.length === 0) return false;
  const ids = classes.map((item) => item.id);
  const idParams = ids;
  const idSlots = ids.map(() => '?').join(', ');

  const [homeworkRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM homework WHERE class_id IN (${idSlots})`,
    idParams
  );
  const [timetableRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM timetables WHERE class_id IN (${idSlots})`,
    idParams
  );
  if (Number(homeworkRows[0]?.total || 0) > 0 || Number(timetableRows[0]?.total || 0) > 0) {
    throw conflict('Classes with homework or timetables cannot be deleted until those records are removed.');
  }

  const [feeRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM student_fees WHERE class_id IN (${idSlots})`,
    idParams
  );
  if (!transferStudents && Number(feeRows[0]?.total || 0) > 0) {
    throw conflict('Classes with student fee records cannot be deleted as a whole standard.');
  }

  if (transferStudents && classes.length === 1) {
    const [remainingClasses] = await connection.execute(
      `SELECT classes.id, classes.division, COUNT(students.id) AS student_total
       FROM classes
       LEFT JOIN students ON students.class_id = classes.id AND students.school_id = classes.school_id
       WHERE classes.school_id = ? AND classes.standard = ? AND classes.id <> ?
       GROUP BY classes.id, classes.division
       ORDER BY classes.division`,
      [schoolId, classes[0].standard, classes[0].id]
    );
    const [students] = await connection.execute(
      'SELECT id FROM students WHERE school_id = ? AND class_id = ? ORDER BY id',
      [schoolId, classes[0].id]
    );

    if (remainingClasses.length === 0 && Number(feeRows[0]?.total || 0) > 0) {
      throw conflict('The last division cannot be deleted while student fee records reference it.');
    }

    const counts = remainingClasses.map((item) => ({
      ...item,
      student_total: Number(item.student_total),
    }));
    for (const student of students) {
      if (counts.length === 0) {
        await connection.execute(
          `UPDATE students SET class_id = NULL, division = ''
           WHERE id = ? AND school_id = ?`,
          [student.id, schoolId]
        );
        continue;
      }
      counts.sort((left, right) => left.student_total - right.student_total || left.division.localeCompare(right.division));
      const target = counts[0];
      await connection.execute(
        'UPDATE students SET class_id = ?, division = ? WHERE id = ? AND school_id = ?',
        [target.id, target.division, student.id, schoolId]
      );
      await connection.execute(
        'UPDATE student_fees SET class_id = ? WHERE student_id = ? AND school_id = ?',
        [target.id, student.id, schoolId]
      );
      target.student_total += 1;
    }
    const [unmovedFees] = await connection.execute(
      `SELECT COUNT(*) AS total FROM student_fees WHERE class_id IN (${idSlots})`,
      idParams
    );
    if (Number(unmovedFees[0]?.total || 0) > 0) {
      throw conflict('Some fee records could not be moved with their students.');
    }
    for (const item of counts) {
      await connection.execute(
        'UPDATE classes SET student_count = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND school_id = ?',
        [item.student_total, item.id, schoolId]
      );
    }
  } else {
    await connection.execute(
      `UPDATE students SET class_id = NULL, division = ''
       WHERE school_id = ? AND class_id IN (${idSlots})`,
      [schoolId, ...idParams]
    );
  }

  await connection.execute(
    `UPDATE teachers SET class_teacher_of = NULL, is_class_teacher = FALSE
     WHERE school_id = ? AND class_teacher_of IN (${idSlots})`,
    [schoolId, ...idParams]
  );
  await connection.execute(
    `UPDATE attendance SET class_id = NULL WHERE school_id = ? AND class_id IN (${idSlots})`,
    [schoolId, ...idParams]
  );
  await connection.execute(
    `UPDATE notices SET target_class_id = NULL WHERE school_id = ? AND target_class_id IN (${idSlots})`,
    [schoolId, ...idParams]
  );
  await connection.execute(`DELETE FROM teacher_classes WHERE class_id IN (${idSlots})`, idParams);
  await connection.execute(
    `DELETE FROM teacher_subject_class_assignments WHERE class_id IN (${idSlots})`,
    idParams
  );

  const [exams] = await connection.execute(
    `SELECT id FROM exams WHERE school_id = ? AND class_id IN (${idSlots})`,
    [schoolId, ...idParams]
  );
  if (exams.length > 0) {
    const examIds = exams.map((exam) => exam.id);
    const examSlots = examIds.map(() => '?').join(', ');
    const [notices] = await connection.execute(
      `SELECT id FROM notices WHERE school_id = ? AND exam_id IN (${examSlots})`,
      [schoolId, ...examIds]
    );
    if (notices.length > 0) {
      const noticeIds = notices.map((notice) => notice.id);
      const noticeSlots = noticeIds.map(() => '?').join(', ');
      await connection.execute(`DELETE FROM notice_attachments WHERE notice_id IN (${noticeSlots})`, noticeIds);
      await connection.execute(`DELETE FROM notice_views WHERE notice_id IN (${noticeSlots})`, noticeIds);
      await connection.execute(`DELETE FROM notices WHERE id IN (${noticeSlots})`, noticeIds);
    }
    await connection.execute(`DELETE FROM marks WHERE exam_id IN (${examSlots})`, examIds);
    await connection.execute(`DELETE FROM exams WHERE id IN (${examSlots})`, examIds);
  }

  await connection.execute(
    `DELETE FROM classes WHERE school_id = ? AND id IN (${idSlots})`,
    [schoolId, ...idParams]
  );
  return true;
});

const deleteClass = async ({ schoolId, classId }) => {
  const [rows] = await getMysqlPool().execute(
    'SELECT id FROM classes WHERE id = ? AND school_id = ? LIMIT 1',
    [classId, schoolId]
  );
  if (rows.length === 0) return false;
  return deleteClasses({ schoolId, classIds: [classId], transferStudents: true });
};

const deleteStandard = async ({ schoolId, standard }) => {
  const [rows] = await getMysqlPool().execute(
    'SELECT id FROM classes WHERE school_id = ? AND standard = ?',
    [schoolId, standard]
  );
  if (rows.length === 0) return false;
  return deleteClasses({
    schoolId,
    classIds: rows.map((row) => row.id),
    transferStudents: false,
  });
};

const loadSubjectExtras = async (subjects, includeTeacherPhone = false) => {
  if (subjects.length === 0) return [];
  const ids = subjects.map((subject) => subject.id);
  const placeholders = ids.map(() => '?').join(', ');
  const pool = getMysqlPool();
  const [lectureRows] = await pool.execute(
    `SELECT * FROM subject_lectures WHERE subject_id IN (${placeholders}) ORDER BY id`,
    ids
  );
  const [teacherRows] = await pool.execute(
    `SELECT teacher_subjects.subject_id, teachers.id, teachers.name, teachers.email
       ${includeTeacherPhone ? ', teachers.phone' : ''}
     FROM teacher_subjects
     INNER JOIN subjects ON subjects.id = teacher_subjects.subject_id
     INNER JOIN teachers ON teachers.id = teacher_subjects.teacher_id
       AND teachers.school_id = subjects.school_id
     WHERE teacher_subjects.subject_id IN (${placeholders})`,
    ids
  );
  const lecturesBySubject = new Map();
  for (const row of lectureRows) {
    if (!lecturesBySubject.has(row.subject_id)) lecturesBySubject.set(row.subject_id, []);
    lecturesBySubject.get(row.subject_id).push({
      standard: row.standard,
      weeklyLectures: Number(row.weekly_lectures),
      lectureDuration: row.lecture_duration,
      totalPortionLectures: Number(row.total_portion_lectures),
      weightage: Number(row.weightage),
    });
  }
  const teachersBySubject = new Map();
  for (const row of teacherRows) {
    if (!teachersBySubject.has(row.subject_id)) teachersBySubject.set(row.subject_id, []);
    teachersBySubject.get(row.subject_id).push({
      _id: row.id,
      name: row.name,
      email: row.email,
      ...(includeTeacherPhone ? { phone: row.phone } : {}),
    });
  }
  return subjects.map((row) => ({
    ...mapRow(row),
    lecturesPerStandard: lecturesBySubject.get(row.id) || [],
    assignedTeachers: teachersBySubject.get(row.id) || [],
  }));
};

const listSubjects = async ({ schoolId, page, limit, search }) => {
  const safePage = parsePositiveInteger(page, 1);
  const safeLimit = parsePositiveInteger(limit, 10);
  const offset = (safePage - 1) * safeLimit;
  const searchSql = search ? 'AND (LOWER(name) LIKE LOWER(?) OR LOWER(code) LIKE LOWER(?))' : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`] : [];
  const [rows] = await getMysqlPool().execute(
    `SELECT * FROM subjects WHERE school_id = ? ${searchSql}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [schoolId, ...searchParams, safeLimit, offset]
  );
  const [countRows] = await getMysqlPool().execute(
    `SELECT COUNT(*) AS total FROM subjects WHERE school_id = ? ${searchSql}`,
    [schoolId, ...searchParams]
  );
  const total = Number(countRows[0]?.total || 0);
  return {
    subjects: await loadSubjectExtras(rows),
    pagination: { total, pages: Math.ceil(total / safeLimit) },
  };
};

const getSubjectById = async ({ schoolId, subjectId, includeTeacherPhone = false }) => {
  const [rows] = await getMysqlPool().execute(
    'SELECT * FROM subjects WHERE id = ? AND school_id = ? LIMIT 1',
    [subjectId, schoolId]
  );
  if (rows.length === 0) return null;
  const [subject] = await loadSubjectExtras(rows, includeTeacherPhone);
  return subject;
};

const saveSubjectLectures = async (connection, subjectId, lectures) => {
  if (!Array.isArray(lectures)) {
    const error = new Error('lecturesPerStandard must be an array');
    error.statusCode = 400;
    throw error;
  }
  for (const lecture of lectures) {
    await connection.execute(
      `INSERT INTO subject_lectures
        (subject_id, standard, weekly_lectures, lecture_duration, total_portion_lectures, weightage)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        subjectId,
        lecture.standard,
        lecture.weeklyLectures === undefined ? 5 : lecture.weeklyLectures,
        lecture.lectureDuration || '60',
        lecture.totalPortionLectures === undefined ? 40 : lecture.totalPortionLectures,
        lecture.weightage === undefined ? 1 : lecture.weightage,
      ]
    );
  }
};

const createSubject = async ({ schoolId, data }) => {
  if (typeof data.name !== 'string' || data.name.trim() === ''
      || typeof data.code !== 'string' || data.code.trim() === '') {
    const error = new Error('Subject name and code are required');
    error.statusCode = 400;
    throw error;
  }

  const subjectId = await withTransaction(async (connection) => {
    const id = createId();
    await connection.execute(
      `INSERT INTO subjects
        (id, school_id, name, code, description, max_marks, min_marks, standard,
         default_weekly_lectures, weightage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      [
        id,
        schoolId,
        data.name,
        data.code,
        data.description || null,
        data.maxMarks === undefined ? 100 : data.maxMarks,
        data.minMarks === undefined ? 35 : data.minMarks,
        data.standard || null,
        data.defaultWeeklyLectures === undefined ? 5 : data.defaultWeeklyLectures,
        data.weightage === undefined ? 1 : data.weightage,
      ]
    );
    if (data.lecturesPerStandard !== undefined) {
      await saveSubjectLectures(connection, id, data.lecturesPerStandard);
    }
    return id;
  });
  return getSubjectById({ schoolId, subjectId });
};

const updateSubject = async ({ schoolId, subjectId, updates }) => {
  for (const field of ['name', 'code']) {
    if (Object.prototype.hasOwnProperty.call(updates, field)
        && (typeof updates[field] !== 'string' || updates[field].trim() === '')) {
      const error = new Error(`Subject ${field} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  const found = await withTransaction(async (connection) => {
    const columns = {
      name: 'name',
      code: 'code',
      description: 'description',
      maxMarks: 'max_marks',
      minMarks: 'min_marks',
      standard: 'standard',
      defaultWeeklyLectures: 'default_weekly_lectures',
      weightage: 'weightage',
    };
    const entries = Object.entries(columns)
      .filter(([field]) => Object.prototype.hasOwnProperty.call(updates, field)
        && updates[field] !== undefined)
      .map(([field, column]) => [column, updates[field]]);
    if (entries.length > 0) {
      await connection.execute(
        `UPDATE subjects SET ${entries.map(([column]) => `\`${column}\` = ?`).join(', ')},
         updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND school_id = ?`,
        [...entries.map(([, value]) => value), subjectId, schoolId]
      );
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'lecturesPerStandard')) {
      const [subjects] = await connection.execute(
        'SELECT id FROM subjects WHERE id = ? AND school_id = ? LIMIT 1',
        [subjectId, schoolId]
      );
      if (subjects.length === 0) return false;
      await connection.execute('DELETE FROM subject_lectures WHERE subject_id = ?', [subjectId]);
      await saveSubjectLectures(connection, subjectId, updates.lecturesPerStandard);
    }
    const [subjects] = await connection.execute(
      'SELECT id FROM subjects WHERE id = ? AND school_id = ? LIMIT 1',
      [subjectId, schoolId]
    );
    return subjects.length > 0;
  });
  return found ? getSubjectById({ schoolId, subjectId }) : null;
};

const assignTeacherToSubject = async ({ schoolId, subjectId, teacherId }) => {
  const [subjects] = await getMysqlPool().execute(
    'SELECT id FROM subjects WHERE id = ? AND school_id = ? LIMIT 1',
    [subjectId, schoolId]
  );
  if (subjects.length === 0) return null;
  const [teachers] = await getMysqlPool().execute(
    'SELECT id FROM teachers WHERE id = ? AND school_id = ? LIMIT 1',
    [teacherId, schoolId]
  );
  if (teachers.length === 0) {
    const error = new Error('Teacher not found in this school');
    error.statusCode = 404;
    throw error;
  }
  await getMysqlPool().execute(
    'INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)',
    [teacherId, subjectId]
  );
  return getSubjectById({ schoolId, subjectId });
};

const deleteSubject = async ({ schoolId, subjectId }) => withTransaction(async (connection) => {
  const [subjects] = await connection.execute(
    'SELECT id FROM subjects WHERE id = ? AND school_id = ? FOR UPDATE',
    [subjectId, schoolId]
  );
  if (subjects.length === 0) return false;

  const blockingReferences = [
    ['homework', 'subject_id'],
    ['attendance', 'subject_id'],
    ['marks', 'subject_id'],
  ];
  for (const [table, column] of blockingReferences) {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS total FROM \`${table}\` WHERE \`${column}\` = ?`,
      [subjectId]
    );
    if (Number(rows[0]?.total || 0) > 0) {
      throw conflict(`Subject cannot be deleted while ${table} records reference it.`);
    }
  }

  await connection.execute('UPDATE exams SET subject_id = NULL WHERE subject_id = ?', [subjectId]);
  await connection.execute('UPDATE timetable_slots SET subject_id = NULL WHERE subject_id = ?', [subjectId]);
  await connection.execute('DELETE FROM student_subjects WHERE subject_id = ?', [subjectId]);
  await connection.execute('DELETE FROM teacher_subjects WHERE subject_id = ?', [subjectId]);
  await connection.execute('DELETE FROM teacher_assigned_standards WHERE subject_id = ?', [subjectId]);
  await connection.execute('DELETE FROM teacher_subject_class_assignments WHERE subject_id = ?', [subjectId]);
  await connection.execute('DELETE FROM subject_lectures WHERE subject_id = ?', [subjectId]);
  await connection.execute('DELETE FROM subjects WHERE id = ? AND school_id = ?', [subjectId, schoolId]);
  return true;
});

module.exports = {
  assignTeacherToSubject,
  bulkSetupClasses,
  createClass,
  createSubject,
  deleteClass,
  deleteStandard,
  deleteSubject,
  getClassById: findClassRows,
  getClassStudents,
  getSubjectById,
  listClasses,
  listSubjects,
  updateClass,
  updateSubject,
};
