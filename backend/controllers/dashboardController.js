const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Complaint = require('../models/Complaint');
const Marks = require('../models/Marks');
const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Family = require('../models/Family');
const Event = require('../models/Event');
const StudentFee = require('../models/StudentFee');
const FeeStructure = require('../models/FeeStructure');
const Timetable = require('../models/Timetable');
const Homework = require('../models/Homework');
const mongoose = require('mongoose');

// Get Admin Dashboard Stats
exports.getAdminStats = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 9);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const [
      totalStudents,
      totalTeachers,
      totalFamilies,
      totalClasses,
      totalAttendance,
      pendingComplaints,
      todayRecords,
      attendanceByDay,
      studentsByGrade,
      recentAdmissions,
      upcomingExams,
      upcomingEvents,
      feeStructures,
      feeRecords,
    ] = await Promise.all([
      Student.countDocuments({ schoolId }),
      Teacher.countDocuments({ schoolId }),
      Family.countDocuments({ schoolId }),
      Class.countDocuments({ schoolId }),
      Attendance.countDocuments({ schoolId }),
      Complaint.countDocuments({ schoolId, status: 'Pending' }),
      Attendance.find({ schoolId, date: { $gte: today, $lt: tomorrow } })
        .select('status')
        .lean(),
      Attendance.aggregate([
        { $match: { schoolId: schoolObjectId, date: { $gte: trendStart, $lt: tomorrow } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: timeZone } },
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Student.aggregate([
        { $match: { schoolId: schoolObjectId } },
        {
          $lookup: {
            from: Class.collection.name,
            localField: 'classId',
            foreignField: '_id',
            as: 'class',
          },
        },
        {
          $group: {
            _id: { $ifNull: [{ $arrayElemAt: ['$class.standard', 0] }, 'Unassigned'] },
            value: { $sum: 1 },
          },
        },
        { $project: { _id: 0, name: '$_id', value: 1 } },
        { $sort: { name: 1 } },
      ]),
      Student.find({ schoolId })
        .select('name firstName lastName rollNumber admissionDate createdAt classId')
        .populate('classId', 'standard division')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Exam.find({ schoolId, date: { $gte: today } })
        .populate('classId', 'standard division')
        .sort({ date: 1 })
        .limit(5)
        .lean(),
      Event.find({ schoolId, startDate: { $gte: today } })
        .select('name eventType startDate endDate location')
        .sort({ startDate: 1 })
        .limit(5)
        .lean(),
      FeeStructure.find({ schoolId }).select('standard totalAmount q1Amount q2Amount q3Amount q4Amount').lean(),
      StudentFee.find({ schoolId })
        .populate('classId', 'standard')
        .select('classId q1Status q2Status q3Status q4Status')
        .lean(),
    ]);

    const attendanceDays = new Map(attendanceByDay.map((day) => [day._id, day]));
    const attendanceTrend = Array.from({ length: 10 }, (_, index) => {
      const date = new Date(trendStart);
      date.setDate(trendStart.getDate() + index);
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
      const day = attendanceDays.get(key);
      return {
        date: key,
        label: date.toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
        percentage: day?.total ? Math.round((day.present / day.total) * 100) : null,
        recorded: day?.total || 0,
      };
    });

    const feeStructureByStandard = new Map(feeStructures.map((structure) => [structure.standard, structure]));
    const feeSummary = feeRecords.reduce((summary, record) => {
      const structure = feeStructureByStandard.get(record.classId?.standard);
      if (!structure) return summary;

      const quarters = ['q1', 'q2', 'q3', 'q4'];
      summary.expected += structure.totalAmount || 0;
      const hasPendingQuarter = quarters.some((quarter) => record[`${quarter}Status`] !== 'Paid');
      quarters.forEach((quarter) => {
        if (record[`${quarter}Status`] === 'Paid') {
          summary.collected += structure[`${quarter}Amount`] || 0;
        }
      });
      summary.trackedRecords += 1;
      if (hasPendingQuarter) summary.pendingRecords += 1;
      return summary;
    }, { expected: 0, collected: 0, trackedRecords: 0, pendingRecords: 0 });

    res.json({
      stats: {
        totalStudents,
        totalTeachers,
        totalFamilies,
        totalClasses,
        totalAttendance,
        pendingComplaints,
        todayAttendance: todayRecords.length,
        todayAttendancePercentage: todayRecords.length
          ? Math.round((todayRecords.filter((record) => record.status === 'Present').length / todayRecords.length) * 100)
          : null,
      },
      attendanceTrend,
      studentsByGrade,
      recentAdmissions,
      upcomingExams,
      upcomingEvents,
      feeSummary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Teacher Dashboard Stats
exports.getTeacherStats = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const teacherId = req.user.userId;
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId })
      .populate('classTeacherOf', 'standard division')
      .populate('subjectClassAssignments.subjectId', 'name code')
      .populate('subjectClassAssignments.classId', 'standard division');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const assignmentMap = new Map((teacher.subjectClassAssignments || [])
      .filter((assignment) => assignment.classId && assignment.subjectId)
      .map((assignment) => {
        const row = {
          classId: assignment.classId._id,
          classLabel: `Grade ${assignment.classId.standard}${assignment.classId.division ? ` - ${assignment.classId.division}` : ''}`,
          subjectId: assignment.subjectId._id,
          subjectName: assignment.subjectId.name,
          subjectCode: assignment.subjectId.code,
        };
        return [`${String(row.classId)}:${String(row.subjectId)}`, row];
      }));
    const assignments = [...assignmentMap.values()];

    if (teacher.isClassTeacher && teacher.classTeacherOf) {
      assignments.push({
        classId: teacher.classTeacherOf._id,
        classLabel: `Grade ${teacher.classTeacherOf.standard}${teacher.classTeacherOf.division ? ` - ${teacher.classTeacherOf.division}` : ''}`,
        subjectId: null,
        subjectName: 'Class attendance',
        subjectCode: '',
      });
    }

    const classIds = [...new Set(assignments.map((assignment) => String(assignment.classId)))];
    const classObjectIds = classIds.map((id) => new mongoose.Types.ObjectId(id));
    const [studentCounts, timetableRecords, attendanceRecords, homeworkRecords] = await Promise.all([
      classObjectIds.length
        ? Student.aggregate([
          { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), classId: { $in: classObjectIds } } },
          { $group: { _id: '$classId', count: { $sum: 1 } } },
        ])
        : [],
      classObjectIds.length
        ? Timetable.find({ schoolId, classId: { $in: classObjectIds }, isActive: true })
          .select('classId slots')
          .lean()
        : [],
      classObjectIds.length
        ? Attendance.find({
          schoolId,
          classId: { $in: classObjectIds },
          $or: [
            { teacherId },
            { markedBy: teacherId, markedByModel: 'Teacher' },
          ],
        })
          .select('classId subjectId status')
          .lean()
        : [],
      Homework.find({ schoolId, teacherId })
        .select('classId subjectId title dueDate totalStudents submittedCount')
        .lean(),
    ]);

    const studentsByClass = new Map(studentCounts.map((entry) => [String(entry._id), entry.count]));
    const periodsByAssignment = new Map();
    timetableRecords.forEach((timetable) => {
      timetable.slots.forEach((slot) => {
        if (slot.isBreak || String(slot.teacherId) !== String(teacherId)) return;
        const key = `${String(timetable.classId)}:${String(slot.subjectId || '')}`;
        periodsByAssignment.set(key, (periodsByAssignment.get(key) || 0) + 1);
      });
    });

    const attendanceByAssignment = new Map();
    attendanceRecords.forEach((record) => {
      const key = `${String(record.classId)}:${String(record.subjectId || '')}`;
      const summary = attendanceByAssignment.get(key) || { total: 0, present: 0 };
      summary.total += 1;
      if (record.status === 'Present') summary.present += 1;
      attendanceByAssignment.set(key, summary);
    });

    const assignmentRows = assignments.map((assignment) => {
      const key = `${String(assignment.classId)}:${String(assignment.subjectId || '')}`;
      const attendance = attendanceByAssignment.get(key);
      return {
        ...assignment,
        studentCount: studentsByClass.get(String(assignment.classId)) || 0,
        periodsPerWeek: periodsByAssignment.get(key) || 0,
        attendancePercentage: attendance?.total
          ? Math.round((attendance.present / attendance.total) * 100)
          : null,
        attendanceRecords: attendance?.total || 0,
      };
    });

    const uniqueStudentCount = classObjectIds.length
      ? await Student.countDocuments({ schoolId, classId: { $in: classObjectIds } })
      : 0;
    const totalPeriods = assignmentRows.reduce((total, assignment) => total + assignment.periodsPerWeek, 0);
    const totalAttendanceRecords = attendanceRecords.length;
    const presentAttendanceRecords = attendanceRecords.filter((record) => record.status === 'Present').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingHomework = homeworkRecords.filter((homework) => new Date(homework.dueDate) >= today);
    const outstandingSubmissions = homeworkRecords.reduce(
      (total, homework) => total + Math.max(0, Number(homework.totalStudents || 0) - Number(homework.submittedCount || 0)),
      0
    );

    res.json({
      stats: {
        totalStudents: uniqueStudentCount,
        assignedClasses: classIds.length,
        assignedSubjects: new Set(assignments.map((assignment) => assignment.subjectName)).size,
        periodsPerWeek: totalPeriods,
        attendancePercentage: totalAttendanceRecords
          ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
          : null,
        attendanceRecords: totalAttendanceRecords,
        upcomingHomework: upcomingHomework.length,
        outstandingSubmissions,
      },
      assignments: assignmentRows,
      teacherStatus: teacher.employeeStatus || (teacher.isActive ? 'Active' : 'Inactive'),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Student Dashboard Stats
exports.getStudentStats = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = req.user.userId;

    const student = await Student.findById(studentId);

    // Attendance percentage
    const allAttendance = await Attendance.find({
      schoolId,
      userId: studentId,
    });

    const presentDays = allAttendance.filter(a => a.status === 'Present').length;
    const attendancePercentage = allAttendance.length > 0 
      ? ((presentDays / allAttendance.length) * 100).toFixed(2) 
      : 0;

    // Average marks
    const marks = await Marks.find({
      schoolId,
      studentId,
    });

    const averageMarks = marks.length > 0 
      ? (marks.reduce((sum, m) => sum + m.percentage, 0) / marks.length).toFixed(2)
      : 0;

    // Pending homework
    const Homework = require('../models/Homework');
    const pendingHomework = await Homework.countDocuments({
      schoolId,
      classId: student.classId,
      dueDate: { $gte: new Date() },
    });

    // Upcoming exams
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingExams = await Exam.countDocuments({
      schoolId,
      classId: student.classId,
      date: { $gte: today },
    });

    res.json({
      stats: {
        attendancePercentage,
        averageMarks,
        pendingHomework,
        upcomingExams,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Analytics
exports.getAnalytics = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    // Student performance over time
    const marks = await Marks.find({ schoolId })
      .select('percentage createdAt')
      .sort({ createdAt: 1 });

    // Monthly attendance
    const attendance = await Attendance.find({ schoolId })
      .select('date status')
      .sort({ date: 1 });

    // Complaint trend
    const complaints = await Complaint.find({ schoolId })
      .select('status createdAt')
      .sort({ createdAt: 1 });

    res.json({
      performance: marks,
      attendance,
      complaints,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
