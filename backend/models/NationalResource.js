const mongoose = require('mongoose');

const nationalResourceSchema = new mongoose.Schema(
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
    topic: { type: String, default: '', trim: true },
    type: {
      type: String,
      enum: ['study-guide', 'question-paper', 'reference', 'other'],
      default: 'other',
    },
    url: { type: String, required: true },
    fileName: { type: String, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      required: true,
    },
    createdByModel: { type: String, enum: ['User', 'Teacher'], required: true },
  },
  { timestamps: true }
);

nationalResourceSchema.index({ schoolId: 1, grade: 1, subject: 1, createdAt: -1 });

module.exports = mongoose.model('NationalResource', nationalResourceSchema);