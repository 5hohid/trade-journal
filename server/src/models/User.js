const mongoose = require('mongoose');
const { ROLES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'user' },
    securityQuestion: { type: String, default: '' },
    securityAnswerHash: { type: String, default: '' },
    disabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
