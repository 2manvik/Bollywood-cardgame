const mongoose = require('mongoose');
const GAME_CONFIG = require('../config/gameConfig');

const roundHistorySchema = new mongoose.Schema(
  {
    roundNumber: { type: Number, required: true },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'GameCard', required: true },
    clue: { type: String, required: true },
    category: { type: String, required: true },
    answer: { type: String, required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    winnerUsername: { type: String, default: null },
    winnerGuess: { type: String, default: null },
    timeTaken: { type: Number, default: null },
    resolvedReason: {
      type: String,
      enum: ['CORRECT_ANSWER', 'TIMEOUT', 'ABANDONED'],
      required: true,
    },
  },
  { _id: false }
);

const playerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    score: { type: Number, default: 0 },
    ready: { type: Boolean, default: false },
    connected: { type: Boolean, default: true },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    players: {
      type: [playerSchema],
      validate: [val => val.length === 2, 'A match must have exactly two players'],
    },
    category: {
      type: String,
      required: true,
      enum: GAME_CONFIG.ALLOWED_MATCH_CATEGORIES,
    },
    status: {
      type: String,
      enum: Object.values(GAME_CONFIG.MATCH_STATUS),
      default: GAME_CONFIG.MATCH_STATUS.WAITING_FOR_PLAYERS,
      index: true,
    },
    configuredRounds: {
      type: Number,
      default: GAME_CONFIG.DEFAULT_ROUNDS,
    },
    currentRound: {
      type: Number,
      default: 0,
    },
    scores: {
      type: Map,
      of: Number,
      default: {},
    },
    usedCardIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameCard',
      },
    ],
    roundHistory: [roundHistorySchema],
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    winnerUsername: {
      type: String,
      default: null,
    },
    isDraw: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // seconds
      default: null,
    },
    completionReason: {
      type: String,
      enum: [...Object.values(GAME_CONFIG.COMPLETION_REASONS), null],
      default: null,
    },
    statsUpdated: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up queries by player and status
matchSchema.index({ 'players.user': 1, status: 1 });
matchSchema.index({ 'players.user': 1, createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
