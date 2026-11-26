const User = require('../models/User');
const School = require('../models/School');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Family = require('../models/Family');
const mongoose = require('mongoose');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { findSchoolByCode, normalizeSchoolCode } = require('../utils/schoolCode');
const {
  createLoginSession,
  createSchoolAndAdmin,
  completePasswordReset,
  findPasswordResetAccount,
  findLoginAccount,
  getUserById,
  getUserProfile,
  mapUser,
  revokeLoginSession,
  rotateLoginSession,
  setPasswordResetCode,
  updateUserPassword,
  updateUserProfile,
  verifyPasswordResetCode,
} = require('../repositories/mysqlAuthRepository');

// Password Validation Helper: 6+ chars, 1 capital, 1 number, 1 special character
const validatePasswordStrength = (password) => {
  const minLength = password.length >= 6;
  const hasCapital = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  return minLength && hasCapital && hasNumber && hasSpecial;
};

const generatePasswordResetCode = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specials = '!@#$%&*';
  const codeArray = [
    letters.charAt(Math.floor(Math.random() * letters.length)),
    numbers.charAt(Math.floor(Math.random() * numbers.length)),
    specials.charAt(Math.floor(Math.random() * specials.length)),
  ];
  const pool = letters + numbers + specials;
  for (let i = 0; i < 2; i++) {
    codeArray.push(pool.charAt(Math.floor(Math.random() * pool.length)));
  }
  for (let i = codeArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [codeArray[i], codeArray[j]] = [codeArray[j], codeArray[i]];
  }
  return codeArray.join('');
};


// Helper to resolve the correct Mongoose model by role
const getUserModelByRole = (role) => {
  if (role === 'admin') return User;
  if (role === 'teacher') return Teacher;
  if (role === 'student') return Student;
  if (role === 'family') return Family;
  return User;
};

// Helper to find a user by ID and role, with a fallback lookup if role is missing
const findUserByIdAndRole = async (id, role) => {
  if (role) {
    const Model = getUserModelByRole(role);
    const user = await Model.findById(id);
    if (user) return user;
  }
  let user = await User.findById(id);
  if (!user) user = await Teacher.findById(id);
  if (!user) user = await Student.findById(id);
  if (!user) user = await Family.findById(id);
  return user;
};

// Register User
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      schoolId,
      schoolCode,
      schoolName,
      rollNumber,
      registrationNumber,
      classId,
      division,
      employeeId,
      qualification,
      experience,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Self-registration is only allowed for Admin/School accounts. Student and Teacher accounts must be created by the Administrator.' });
      }

      if (!schoolName || !schoolCode) {
        return res.status(400).json({ message: 'School name and school code are required for admin registration' });
      }

      if (!validatePasswordStrength(password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
      }

      const hashedPassword = await hashPassword(password);
      const { school, admin } = await createSchoolAndAdmin({
        name: schoolName,
        code: schoolCode,
        email,
        phone,
        address: req.body.address,
        principalName: req.body.adminName || name,
        principalEmail: email,
        adminName: name,
        adminEmail: email,
        adminPassword: hashedPassword,
      });
      const user = {
        _id: admin.id,
        schoolId: school._id,
        name: admin.name,
        email: admin.email,
        phone: phone || null,
        role: 'admin',
      };
      const accessToken = generateAccessToken(user._id, user.schoolId, user.role);
      const refreshToken = generateRefreshToken(user._id, user.schoolId, user.role);
      await createLoginSession({ userId: user._id, role: user.role, refreshToken });

      return res.status(201).json({
        message: 'User registered successfully',
        user,
        school,
        accessToken,
        refreshToken,
      });
    }

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Self-registration is only allowed for Admin/School accounts. Student and Teacher accounts must be created by the Administrator.' });
    }

    let resolvedSchoolId = schoolId;
    let school;

    if (role === 'admin') {
      if (!schoolName || !schoolCode) {
        return res.status(400).json({ message: 'School name and school code are required for admin registration' });
      }

      school = await findSchoolByCode(schoolCode);
      if (school) {
        return res.status(400).json({ message: 'School with this code already exists' });
      }
    } else {
      if (!schoolCode) {
        return res.status(400).json({ message: 'School code is required for teacher and student registration' });
      }

      school = await findSchoolByCode(schoolCode);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      resolvedSchoolId = school._id;
    }

    // Check if user exists in the appropriate collection
    let user = null;
    if (role === 'admin') {
      user = await User.findOne({ email });
    } else if (role === 'teacher') {
      user = await Teacher.findOne({ email, schoolId: resolvedSchoolId });
    } else if (role === 'student') {
      user = await Student.findOne({ email, schoolId: resolvedSchoolId });
    }

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate password strength
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user based on role
    if (role === 'student') {
      user = await Student.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'student',
        schoolId: resolvedSchoolId,
      });
    } else if (role === 'teacher') {
      user = await Teacher.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'teacher',
        schoolId: resolvedSchoolId,
      });
    } else {
      const adminId = new mongoose.Types.ObjectId();
      const schoolIdObject = new mongoose.Types.ObjectId();

      user = await User.create({
        _id: adminId,
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'admin',
        schoolId: schoolIdObject,
      });

      school = await School.create({
        _id: schoolIdObject,
        name: schoolName,
        code: normalizeSchoolCode(schoolCode),
        adminId,
        email,
        phone,
        address: req.body.address,
        principalName: req.body.adminName || name,
        principalEmail: email,
        isActive: true,
      });

      user.schoolId = school._id;
      await user.save();
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.schoolId, user.role);
    const refreshToken = generateRefreshToken(user._id, user.schoolId, user.role);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      message: 'User registered successfully',
      user,
      school,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error.code === 'SCHOOL_ALREADY_EXISTS' || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'School with this code or email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password, schoolCode } = req.body;

    if (!email || !password || !schoolCode) {
      return res.status(400).json({ message: 'Email, password, and school code are required' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      const loginAccount = await findLoginAccount(email, schoolCode);
      if (!loginAccount.school) {
        return res.status(404).json({ message: 'School does not exist' });
      }
      if (!loginAccount.account) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isPasswordValid = await comparePassword(password, loginAccount.account.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = mapUser(loginAccount.account);
      const accessToken = generateAccessToken(user._id, user.schoolId, user.role);
      const refreshToken = generateRefreshToken(user._id, user.schoolId, user.role);
      await createLoginSession({ userId: user._id, role: user.role, refreshToken });

      return res.json({
        message: 'Login successful',
        user,
        school: loginAccount.school,
        accessToken,
        refreshToken,
      });
    }

    // Find school by code
    const school = await findSchoolByCode(schoolCode);
    if (!school) {
      return res.status(404).json({ message: 'School does not exist' });
    }

    // Find user across respective collections
    let user = null;
    user = await User.findOne({ email, schoolId: school._id, role: 'admin' }).select('+password');
    if (!user) {
      user = await Teacher.findOne({ email, schoolId: school._id }).select('+password');
    }
    if (!user) {
      user = await Student.findOne({ email, schoolId: school._id }).select('+password');
    }
    if (!user) {
      user = await Family.findOne({ email, schoolId: school._id }).select('+password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.schoolId, user.role);
    const refreshToken = generateRefreshToken(user._id, user.schoolId, user.role);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    user.lastLogin = new Date();
    await user.save();

    user.password = undefined;
    const schoolData = await School.findById(user.schoolId).populate('adminId', 'name email phone');

    res.json({
      message: 'Login successful',
      user,
      school: schoolData,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      const newRefreshToken = generateRefreshToken(decoded.userId, decoded.schoolId, decoded.role);
      const user = await rotateLoginSession({
        userId: decoded.userId,
        role: decoded.role,
        currentToken: refreshToken,
        nextToken: newRefreshToken,
      });
      if (!user) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const mappedUser = mapUser(user);
      return res.json({
        accessToken: generateAccessToken(mappedUser._id, mappedUser.schoolId, mappedUser.role),
        refreshToken: newRefreshToken,
      });
    }

    const user = await findUserByIdAndRole(decoded.userId, decoded.role);
    if (!user || !user.refreshTokens.find(t => t.token === refreshToken)) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id, user.schoolId, user.role);
    const newRefreshToken = generateRefreshToken(user._id, user.schoolId, user.role);

    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (process.env.DB_ENGINE === 'mysql') {
      await revokeLoginSession({
        userId: req.user.userId,
        role: req.user.role,
        refreshToken,
      });
      return res.json({ message: 'Logged out successfully' });
    }

    const user = await findUserByIdAndRole(req.user.userId, req.user.role);

    if (refreshToken && user) {
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      await user.save();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    if (process.env.DB_ENGINE === 'mysql') {
      const user = await getUserProfile({
        userId: req.user.userId,
        role: req.user.role,
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({ user });
    }

    const Model = getUserModelByRole(req.user.role);
    let query = Model.findById(req.user.userId).populate('schoolId');
    
    if (req.user.role === 'student') {
      query = query.populate('classId').populate('subjectsEnrolled');
    } else if (req.user.role === 'teacher') {
      query = query
        .populate('classTeacherOf')
        .populate('subjectIds')
        .populate({
          path: 'subjectClassAssignments.subjectId',
          select: 'name code standard'
        })
        .populate({
          path: 'subjectClassAssignments.classId',
          select: 'standard division'
        });
    } else if (req.user.role === 'family') {
      query = query.populate('children.studentId', 'name classId division admissionNumber rollNumber');
    }

    const user = await query.select('-password -refreshTokens');

    res.json({
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    if (process.env.DB_ENGINE === 'mysql') {
      const user = await updateUserProfile({
        userId: req.user.userId,
        role: req.user.role,
        name,
        phone,
        avatar,
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({ message: 'Profile updated successfully', user });
    }

    const Model = getUserModelByRole(req.user.role);

    const user = await Model.findByIdAndUpdate(
      req.user.userId,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (process.env.DB_ENGINE === 'mysql') {
      const user = await getUserById({
        userId: req.user.userId,
        role: req.user.role,
        includePassword: true,
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isPasswordValid = await comparePassword(oldPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Old password is incorrect' });
      }

      if (!validatePasswordStrength(newPassword)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
      }

      await updateUserPassword({
        userId: req.user.userId,
        role: req.user.role,
        password: await hashPassword(newPassword),
      });
      return res.json({ message: 'Password changed successfully' });
    }

    const Model = getUserModelByRole(req.user.role);

    const user = await Model.findById(req.user.userId).select('+password');

    const isPasswordValid = await comparePassword(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
    }

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot Password - Send OTP Code
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      const code = generatePasswordResetCode();
      const account = await setPasswordResetCode({
        email,
        code,
        expiresAt: new Date(Date.now() + 60 * 1000),
      });
      if (!account) {
        return res.status(404).json({ message: "User doesn't exist" });
      }

      const { sendResetEmail } = require('../utils/email');
      await sendResetEmail(email, code);
      return res.json({ message: 'A 5-letter verification code has been sent to your email.' });
    }

    // Find user across collections
    let user = await User.findOne({ email });
    if (!user) user = await Teacher.findOne({ email });
    if (!user) user = await Student.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User doesn't exist" });
    }

    // Generate unique 5-char code containing letters, numbers, and special characters
    const code = generatePasswordResetCode();

    // Code valid for 1 minute
    user.passwordResetToken = code;
    user.passwordResetExpires = new Date(Date.now() + 60 * 1000); // 1 minute
    await user.save();

    // Send reset email via SMTP (or fallback log)
    const { sendResetEmail } = require('../utils/email');
    await sendResetEmail(email, code);

    res.json({ message: 'A 5-letter verification code has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify Reset Code
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      const { account, valid } = await verifyPasswordResetCode({ email, code });
      if (!account) {
        return res.status(404).json({ message: "User doesn't exist" });
      }
      if (!valid) {
        return res.status(400).json({ message: 'wrong code' });
      }
      return res.json({ message: 'Code verified successfully.' });
    }

    let user = await User.findOne({ email });
    if (!user) user = await Teacher.findOne({ email });
    if (!user) user = await Student.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User doesn't exist" });
    }

    if (!user.passwordResetToken || user.passwordResetToken !== code || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: 'wrong code' });
    }

    res.json({ message: 'Code verified successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required' });
    }

    if (process.env.DB_ENGINE === 'mysql') {
      const account = await findPasswordResetAccount(email);
      if (!account) {
        return res.status(404).json({ message: "User doesn't exist" });
      }
      const { valid } = await verifyPasswordResetCode({ email, code });
      if (!valid) {
        return res.status(400).json({ message: 'wrong code' });
      }
      if (!validatePasswordStrength(newPassword)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
      }

      const updated = await completePasswordReset({
        email,
        code,
        password: await hashPassword(newPassword),
      });
      if (!updated) {
        return res.status(400).json({ message: 'wrong code' });
      }
      return res.json({ message: 'Password reset successfully.' });
    }

    let user = await User.findOne({ email });
    if (!user) user = await Teacher.findOne({ email });
    if (!user) user = await Student.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User doesn't exist" });
    }

    // Verify code again to prevent direct route hit
    if (!user.passwordResetToken || user.passwordResetToken !== code || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: 'wrong code' });
    }

    // Validate new password strength
    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 capital letter, 1 number, and 1 special character' });
    }

    // Update password
    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
