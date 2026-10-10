const mongoose = require('mongoose');
const GAME_CONFIG = require('../config/gameConfig');

const matchRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    selectedCategory: {
      type: String,
      required: true,
      enum: GAME_CONFIG.ALLOWED_MATCH_CATEGORIES,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    matchId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
matchRequestSchema.index({ sender: 1, recipient: 1, status: 1 });
matchRequestSchema.index({ recipient: 1, status: 1, expiresAt: 1 });

// Helper to check if request is active/expired
matchRequestSchema.methods.isExpired = function () {
  return Date.now() > new Date(this.expiresAt).getTime();
};

const MatchRequest = mongoose.model('MatchRequest', matchRequestSchema);
module.exports = MatchRequest;
