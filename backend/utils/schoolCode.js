const School = require('../models/School');

const normalizeSchoolCode = (code) =>
  typeof code === 'string' ? code.trim().toUpperCase() : code;

const findSchoolByCode = (code) => {
  const normalizedCode = normalizeSchoolCode(code);
  if (!normalizedCode) return null;

  const escapedCode = normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return School.findOne({ code: new RegExp(`^${escapedCode}$`, 'i') });
};

module.exports = { findSchoolByCode, normalizeSchoolCode };
