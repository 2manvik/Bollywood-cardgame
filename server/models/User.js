const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
    },
    normalizedUsername: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    normalizedEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    statistics: {
      matchesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      totalCardsWon: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 }, // percentage
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to return safe public profile
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    id: this._id.toString(),
    username: this.username,
    createdAt: this.createdAt,
    statistics: this.statistics,
  };
};

// Method to return private profile for authenticated user
userSchema.methods.toAuthUser = function () {
  return {
    _id: this._id,
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    createdAt: this.createdAt,
    statistics: this.statistics,
  };
};

const User = mongoose.model('User', userSchema);
module.exports = User;
