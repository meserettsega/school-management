const School = require('../models/School');
const User = require('../models/User');
const mongoose = require('mongoose');
const { hashPassword } = require('../utils/password');
const { findSchoolByCode, normalizeSchoolCode } = require('../utils/schoolCode');
const {
  createSchoolAndAdmin,
  getSchoolById,
  getSchoolStats: getMysqlSchoolStats,
  listSchools,
  updateSchoolById,
} = require('../repositories/mysqlAuthRepository');

// Create School (Super Admin Only)
exports.createSchool = async (req, res) => {
  try {
    const { name, code, email, phone, address, principalName, principalEmail, adminName, adminEmail, adminPassword } = req.body;

    if (process.env.DB_ENGINE === 'mysql') {
      if (!name || !code || !email || !phone || !adminName || !adminEmail || !adminPassword) {
        return res.status(400).json({ message: 'School and administrator details are required' });
      }

      const hashedPassword = await hashPassword(adminPassword);
      const result = await createSchoolAndAdmin({
        name,
        code,
        email,
        phone,
        address,
        principalName,
        principalEmail,
        adminName,
        adminEmail,
        adminPassword: hashedPassword,
      });

      return res.status(201).json({
        message: 'School created successfully',
        school: result.school,
        admin: result.admin,
      });
    }

    // Check if school exists
    const schoolExists = await findSchoolByCode(code);
    if (schoolExists) {
      return res.status(400).json({ message: 'School with this code already exists' });
    }

    const adminId = new mongoose.Types.ObjectId();
    const schoolId = new mongoose.Types.ObjectId();
    const hashedPassword = await hashPassword(adminPassword);

    const school = await School.create({
      _id: schoolId,
      name,
      code: normalizeSchoolCode(code),
      adminId,
      email,
      phone,
      address,
      principalName,
      principalEmail,
      isActive: true,
    });

    const admin = await User.create({
      _id: adminId,
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      phone,
      role: 'admin',
      schoolId: school._id,
    });

    res.status(201).json({
      message: 'School created successfully',
      school,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    if (error.code === 'SCHOOL_ALREADY_EXISTS' || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'School with this code or email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get All Schools (Super Admin Only)
exports.getAllSchools = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    if (process.env.DB_ENGINE === 'mysql') {
      const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
      const { schools, total } = await listSchools({
        page: currentPage,
        limit: pageSize,
        search,
      });
      return res.json({
        schools,
        pagination: {
          total,
          pages: Math.ceil(total / pageSize),
        },
      });
    }

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const schools = await School.find(query)
      .populate('adminId', 'name email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await School.countDocuments(query);

    res.json({
      schools,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get School by ID
exports.getSchoolById = async (req, res) => {
  try {
    if (req.params.id !== req.user.schoolId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      const school = await getSchoolById(req.params.id);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      return res.json({ school });
    }

    const school = await School.findById(req.params.id)
      .populate('adminId', 'name email phone');

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json({ school });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get My School (For Admin)
exports.getMySchool = async (req, res) => {
  try {
    if (process.env.DB_ENGINE === 'mysql') {
      const school = await getSchoolById(req.user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      return res.json({ school });
    }

    const school = await School.findById(req.user.schoolId)
      .populate('adminId', 'name email phone');

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json({ school });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update School
exports.updateSchool = async (req, res) => {
  try {
    if (req.params.id !== req.user.schoolId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      const updates = { ...req.body };
      if (typeof updates.code === 'string') {
        updates.code = updates.code.trim().toUpperCase();
      }
      const school = await updateSchoolById(req.params.id, updates);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      return res.json({ message: 'School updated successfully', school });
    }

    const updates = { ...req.body };
    if (typeof updates.code === 'string') {
      updates.code = normalizeSchoolCode(updates.code);
    }

    const school = await School.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('adminId', 'name email');

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json({
      message: 'School updated successfully',
      school,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get School Statistics
exports.getSchoolStats = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    if (process.env.DB_ENGINE === 'mysql') {
      const stats = await getMysqlSchoolStats(schoolId);
      return res.json({ stats });
    }

    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');
    const Class = require('../models/Class');
    const Subject = require('../models/Subject');
    const Attendance = require('../models/Attendance');
    const Complaint = require('../models/Complaint');

    const totalStudents = await Student.countDocuments({ schoolId });
    const totalTeachers = await Teacher.countDocuments({ schoolId });
    const totalClasses = await Class.countDocuments({ schoolId });
    const totalSubjects = await Subject.countDocuments({ schoolId });
    const totalAttendance = await Attendance.countDocuments({ schoolId });
    const pendingComplaints = await Complaint.countDocuments({
      schoolId,
      status: 'Pending',
    });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.countDocuments({
      schoolId,
      date: { $gte: today },
    });

    res.json({
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSubjects,
        totalAttendance,
        pendingComplaints,
        todayAttendance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
