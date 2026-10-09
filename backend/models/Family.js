const mongoose = require('mongoose');

const familySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    schoolCode: {
      type: String,
      default: '',
    },
    schoolName: {
      type: String,
      default: '',
    },
    familyId: {
      type: String,
      default: () => 'FAM' + Math.floor(100000 + Math.random() * 900000),
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['family'],
      default: 'family',
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 2592000,
        },
      },
    ],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    dateOfBirth: Date,
    relationshipToStudent: {
      type: String,
      default: 'Parent',
    },
    preferredContact: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    children: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        relation: {
          type: String,
          default: 'Parent',
        },
        studentName: {
          type: String,
          default: '',
        },
        studentClass: {
          type: String,
          default: '',
        },
        admissionNumber: {
          type: String,
          default: '',
        },
        status: {
          type: String,
          enum: ['Active', 'Inactive'],
          default: 'Active',
        },
      },
    ],
    communicationPreferences: {
      absenceReasonApproval: { type: Boolean, default: true },
      feeNotifications: { type: Boolean, default: true },
      resultAlerts: { type: Boolean, default: true },
      eventAlerts: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: false },
    },
    responsibilities: {
      type: [String],
      default: [
        'Link one or more children to the family profile.',
        'View attendance, marks, report cards, conduct, and teacher comments.',
        'Receive absence, result, fee, and event notifications by app or SMS.',
        'Send an absence reason for the homeroom teacher to approve.',
        'Message the homeroom teacher and request meetings.',
        'Pay fees and see receipts.',
        'See mock exam schedules, results, and weak topics.',
      ],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

familySchema.index({ email: 1, schoolId: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Family', familySchema);
