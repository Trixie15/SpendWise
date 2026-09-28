const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { CURRENCIES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    // Data minimization: only name, email and password are required to use the app
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    currency: { type: String, enum: CURRENCIES, default: 'PHP' },

    // Authorization
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },

    // Session & account security (hidden from queries by default)
    tokenVersion: { type: Number, default: 0, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: Date,
    passwordChangedAt: Date,

    // Multi-factor authentication (secret is AES-256 encrypted, codes are hashed)
    mfaEnabled: { type: Boolean, default: false },
    mfaMethod: { type: String, enum: ['totp', 'email'] },
    mfaSecret: { type: String, select: false },
    mfaTempSecret: { type: String, select: false },
    mfaBackupCodes: { type: [String], select: false },
    emailOtp: {
      type: new mongoose.Schema(
        { hash: String, purpose: String, attempts: { type: Number, default: 0 }, sentAt: Date, expiresAt: Date },
        { _id: false }
      ),
      select: false,
    },

    // Privacy consent record
    consent: {
      acceptedAt: Date,
      policyVersion: String,
    },
  },
  { timestamps: true }
);

// Hash password with bcrypt (cost 12) whenever it changes
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

// Sensitive fields are never sent to the client, even if selected
const HIDDEN = ['password', 'tokenVersion', 'failedLoginAttempts', 'lockUntil', 'mfaSecret', 'mfaTempSecret', 'mfaBackupCodes', 'emailOtp', '__v'];
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    HIDDEN.forEach((field) => delete ret[field]);
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
