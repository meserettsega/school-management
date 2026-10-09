const Family = require('../models/Family');
const Student = require('../models/Student');
const School = require('../models/School');
const Attendance = require('../models/Attendance');
const StudentFee = require('../models/StudentFee');
const FeeStructure = require('../models/FeeStructure');

const getLinkedStudent = async (req, studentId) => {
  const family = await Family.findOne({ _id: req.user.userId, schoolId: req.user.schoolId });
  if (!family || !family.children.some(child => child.studentId.toString() === studentId)) {
    return { error: { status: 404, message: 'Linked child not found' } };
  }

  const student = await Student.findOne({ _id: studentId, schoolId: req.user.schoolId })
    .populate('classId', 'standard division');
  if (!student) return { error: { status: 404, message: 'Linked child not found' } };

  return { student };
};

const normalizeChildren = async (children = []) => {
  const normalized = [];

  for (const item of children) {
    const studentId = item.studentId || item;
    if (!studentId) continue;

    const student = await Student.findById(studentId).populate('classId', 'standard division');
    const child = {
      studentId,
      relation: item.relation || item.relationship || 'Parent',
      studentName: student?.name || '',
      studentClass: student?.classId ? `${student.classId.standard || ''} ${student.classId.division || ''}`.trim() : '',
      admissionNumber: student?.admissionNumber || '',
      status: item.status || 'Active',
    };

    normalized.push(child);
  }

  return normalized;
};

exports.getAllFamilies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const schoolId = req.user.schoolId;

    let query = { schoolId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { familyId: { $regex: search, $options: 'i' } },
      ];
    }

    const families = await Family.find(query)
      .populate('children.studentId', 'name admissionNumber classId division rollNumber')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Family.countDocuments(query);

    res.json({
      families,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyFamily = async (req, res) => {
  try {
    const family = await Family.findOne({ _id: req.user.userId, schoolId: req.user.schoolId })
      .populate('children.studentId', 'name admissionNumber classId division rollNumber');

    if (!family) {
      return res.status(404).json({ message: 'Family profile not found' });
    }

    res.json({ family });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getChildAttendance = async (req, res) => {
  try {
    const { student, error } = await getLinkedStudent(req, req.params.studentId);
    if (error) return res.status(error.status).json({ message: error.message });

    const dateFilter = {};
    if (req.query.startDate || req.query.endDate) {
      dateFilter.date = {};
      if (req.query.startDate) dateFilter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setUTCHours(23, 59, 59, 999);
        dateFilter.date.$lte = endDate;
      }
    }

    const records = await Attendance.find({
      schoolId: req.user.schoolId,
      userId: student._id,
      ...dateFilter,
    })
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name')
      .sort({ date: -1 });

    const total = records.length;
    const present = records.filter(record => record.status === 'Present').length;
    const percentage = total ? ((present / total) * 100).toFixed(1) : '0.0';

    res.json({
      student: { _id: student._id, name: student.name, classId: student.classId },
      records,
      stats: {
        total,
        present,
        absent: records.filter(record => record.status === 'Absent').length,
        late: records.filter(record => record.status === 'Late').length,
        leave: records.filter(record => record.status === 'Leave').length,
        percentage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getChildFeeHistory = async (req, res) => {
  try {
    const { student, error } = await getLinkedStudent(req, req.params.studentId);
    if (error) return res.status(error.status).json({ message: error.message });

    const [fee, structure] = await Promise.all([
      StudentFee.findOne({ studentId: student._id, schoolId: req.user.schoolId }),
      FeeStructure.findOne({
        schoolId: req.user.schoolId,
        standard: student.classId?.standard,
      }),
    ]);

    res.json({
      student: { _id: student._id, name: student.name, classId: student.classId },
      fee,
      structure,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFamilyById = async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
      .populate('children.studentId', 'name admissionNumber classId division rollNumber');

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    if (req.user.role === 'family' && req.user.userId !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (family.schoolId.toString() !== req.user.schoolId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ family });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createFamily = async (req, res) => {
  try {
    const { name, email, password, phone, children, notes, relationshipToStudent, ...rest } = req.body;

    const familyExists = await Family.findOne({ email, schoolId: req.user.schoolId });
    if (familyExists) {
      return res.status(400).json({ message: 'Family already exists for this school' });
    }

    const { hashPassword, validatePasswordStrength } = require('../utils/password');
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
    }

    const schoolData = await School.findById(req.user.schoolId);
    const normalizedChildren = await normalizeChildren(children || []);

    const family = await Family.create({
      name,
      email,
      password: await hashPassword(password),
      phone,
      role: 'family',
      schoolId: req.user.schoolId,
      schoolCode: schoolData?.code || '',
      schoolName: schoolData?.name || '',
      relationshipToStudent,
      notes,
      children: normalizedChildren,
      ...rest,
    });

    res.status(201).json({ message: 'Family created successfully', family });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const missingFields = Object.keys(error.errors).map(key => error.errors[key].message);
      return res.status(400).json({ message: `Validation Error: ${missingFields.join(', ')}` });
    }

    res.status(500).json({ message: error.message });
  }
};

exports.updateFamily = async (req, res) => {
  try {
    const { password, children, ...rest } = req.body;

    if (password) {
      const { hashPassword, validatePasswordStrength } = require('../utils/password');
      if (!validatePasswordStrength(password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
      }
      rest.password = await hashPassword(password);
    }

    if (children) {
      rest.children = await normalizeChildren(children);
    }

    const schoolData = await School.findById(req.user.schoolId);
    if (schoolData) {
      rest.schoolCode = schoolData.code;
      rest.schoolName = schoolData.name;
    }

    const family = await Family.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      rest,
      { new: true, runValidators: true }
    ).populate('children.studentId', 'name admissionNumber classId division rollNumber');

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    res.json({ message: 'Family updated successfully', family });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteFamily = async (req, res) => {
  try {
    const family = await Family.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    res.json({ message: 'Family deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.linkStudent = async (req, res) => {
  try {
    const { studentId, relation } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: 'Student is required' });
    }

    const student = await Student.findById(studentId).populate('classId', 'standard division');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const family = await Family.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const alreadyLinked = family.children.some(child => child.studentId.toString() === studentId.toString());
    if (alreadyLinked) {
      return res.status(400).json({ message: 'This student is already linked to this family' });
    }

    family.children.push({
      studentId,
      relation: relation || 'Parent',
      studentName: student.name,
      studentClass: student.classId ? `${student.classId.standard || ''} ${student.classId.division || ''}`.trim() : '',
      admissionNumber: student.admissionNumber || '',
      status: 'Active',
    });

    await family.save();
    res.json({ message: 'Student linked successfully', family });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unlinkStudent = async (req, res) => {
  try {
    const family = await Family.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    family.children = family.children.filter(child => child.studentId.toString() !== req.params.studentId);
    await family.save();

    res.json({ message: 'Student unlinked successfully', family });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
