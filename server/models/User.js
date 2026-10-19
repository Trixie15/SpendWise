const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { CURRENCIES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    // Data minimization: only first name, last name, email and password are required
    firstName: { type: String, trim: true, maxlength: [50, 'First name cannot exceed 50 characters'] },
    lastName: { type: String, trim: true, maxlength: [50, 'Last name cannot exceed 50 characters'] },
    // Full name, kept in sync automatically (used for display, search and emails)
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [101, 'Name is too long'],
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

// Keep the full name in sync with first and last name
userSchema.pre('validate', async function () {
  if (this.isModified('firstName') || this.isModified('lastName')) {
    this.name = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  }
});

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
    // Accounts created before first/last name existed: split the full name
    if (!ret.firstName && ret.name) {
      const parts = ret.name.trim().split(/\s+/);
      ret.firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
      ret.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    }
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
