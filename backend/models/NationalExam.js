const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['study-guide', 'question-paper', 'reference', 'other'],
      default: 'other',
    },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: value => value.length >= 2 && value.length <= 6,
    },
    correctOption: { type: Number, required: true, min: 0, max: 5 },
    explanation: { type: String, default: '' },
    points: { type: Number, default: 1, min: 1 },
  },
  { _id: true }
);

const nationalExamSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    grade: { type: String, enum: ['6', '8', '12'], required: true },
    subject: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 240 },
    attemptsAllowed: { type: Number, default: 0, min: 0 },
    availableFrom: Date,
    availableUntil: Date,
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    questions: { type: [questionSchema], validate: value => value.length > 0 },
    resources: { type: [resourceSchema], default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      required: true,
    },
    createdByModel: { type: String, enum: ['User', 'Teacher'], required: true },
  },
  { timestamps: true }
);

nationalExamSchema.index({ schoolId: 1, grade: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('NationalExam', nationalExamSchema);