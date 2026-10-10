const mongoose = require('mongoose');
const { normalizeString } = require('../utils/answerValidator');
const GAME_CONFIG = require('../config/gameConfig');

const gameCardSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: GAME_CONFIG.ALLOWED_CONTENT_CATEGORIES,
        message: 'Category must be either bollywood_movies or bollywood_songs',
      },
      index: true,
    },
    clue: {
      type: String,
      required: [true, 'Clue is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
    normalizedAnswer: {
      type: String,
      required: true,
      index: true,
    },
    acceptedAnswers: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      enum: {
        values: GAME_CONFIG.DIFFICULTIES,
        message: 'Difficulty must be easy, medium, or hard',
      },
      default: 'easy',
      index: true,
    },
    hint: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on category and normalized answer
gameCardSchema.index({ category: 1, normalizedAnswer: 1 }, { unique: true });

// Pre-validate hook to set normalizedAnswer
gameCardSchema.pre('validate', function (next) {
  if (this.answer) {
    this.normalizedAnswer = normalizeString(this.answer);
  }
  next();
});

// Helper method to get safe public clue for players during active round
gameCardSchema.methods.toPublicClue = function () {
  return {
    cardId: this._id.toString(),
    category: this.category,
    clue: this.clue,
    difficulty: this.difficulty,
    hint: this.hint || undefined,
  };
};

const GameCard = mongoose.model('GameCard', gameCardSchema);
module.exports = GameCard;
