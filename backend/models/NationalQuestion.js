const mongoose = require('mongoose');

const nationalQuestionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    grade: { type: String, enum: ['6', '8', '12'], required: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, default: '', trim: true },
    difficulty: { type: String, enum: ['Foundation', 'Standard', 'Advanced'], default: 'Standard' },
    prompt: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: value => value.length >= 2 && value.length <= 6,
    },
    correctOption: { type: Number, required: true, min: 0, max: 5 },
    explanation: { type: String, default: '' },
    points: { type: Number, default: 1, min: 1 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      required: true,
    },
    createdByModel: { type: String, enum: ['User', 'Teacher'], required: true },
  },
  { timestamps: true }
);

nationalQuestionSchema.index({ schoolId: 1, grade: 1, subject: 1, topic: 1 });

module.exports = mongoose.model('NationalQuestion', nationalQuestionSchema);