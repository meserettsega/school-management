const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true, min: 0 },
    selectedOption: { type: Number, default: null, min: 0, max: 5 },
    flagged: { type: Boolean, default: false },
  },
  { _id: false }
);

const nationalExamAttemptSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NationalExam',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    answers: { type: [answerSchema], default: [] },
    status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress' },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    submittedAt: Date,
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
  },
  { timestamps: true }
);

nationalExamAttemptSchema.index({ schoolId: 1, studentId: 1, examId: 1, status: 1 });

module.exports = mongoose.model('NationalExamAttempt', nationalExamAttemptSchema);