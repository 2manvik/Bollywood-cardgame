const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const GameCard = require('../models/GameCard');
const Match = require('../models/Match');
const MatchRequest = require('../models/MatchRequest');
const { normalizeString, compactString, isAnswerCorrect } = require('../utils/answerValidator');
const matchmakingService = require('../services/matchmakingService');
const matchService = require('../services/matchService');
const GAME_CONFIG = require('../config/gameConfig');

describe('GUESS IT! Backend Test Suite', () => {
  before(async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/guess_it_test';
    process.env.JWT_SECRET = 'test_secret_key_12345';
    await connectDB();
    // Clean test db collections
    await User.deleteMany({});
    await GameCard.deleteMany({});
    await Match.deleteMany({});
    await MatchRequest.deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  // 1. ANSWER VALIDATOR TESTS
  describe('Answer Validation & Normalization', () => {
    test('normalizes lowercase, spaces and punctuation', () => {
      assert.strictEqual(normalizeString('  Dilwale Dulhania Le Jayenge!  '), 'dilwale dulhania le jayenge');
      assert.strictEqual(normalizeString('3   Idiots'), '3 idiots');
      assert.strictEqual(normalizeString('Kabhi Khushi Kabhie Gham...'), 'kabhi khushi kabhie gham');
    });

    test('validates correct answers and accepted alternatives', () => {
      const answer = 'Dilwale Dulhania Le Jayenge';
      const accepted = ['DDLJ', 'Dilwale Dulhaniya Le Jayenge'];

      assert.strictEqual(isAnswerCorrect('dilwale dulhania le jayenge', answer, accepted), true);
      assert.strictEqual(isAnswerCorrect('DDLJ', answer, accepted), true);
      assert.strictEqual(isAnswerCorrect('ddlj', answer, accepted), true);
      assert.strictEqual(isAnswerCorrect('Dilwale Dulhaniya Le Jayenge', answer, accepted), true);
      assert.strictEqual(isAnswerCorrect('Dilwale', answer, accepted), false);
      assert.strictEqual(isAnswerCorrect('Sholay', answer, accepted), false);
    });

    test('validates abbreviations and numbers', () => {
      const answer = '3 Idiots';
      const accepted = ['Three Idiots'];

      assert.strictEqual(isAnswerCorrect('3 Idiots', answer, accepted), true);
      assert.strictEqual(isAnswerCorrect('three idiots', answer, accepted), true);
      assert.strictEqual(isAnswerCorrect('3Idiots', answer, accepted), true);
      assert.strictEqual(isAnswerCorrect('4 Idiots', answer, accepted), false);
    });
  });

  // 2. USER MODEL & AUTH TESTS
  describe('User Model & Auth Persistence', () => {
    test('creates user with hashed password and initialized statistics', async () => {
      const bcrypt = require('bcryptjs');
      const password = 'securepassword123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const user = await User.create({
        username: 'TestPlayer1',
        normalizedUsername: 'testplayer1',
        email: 'test1@example.com',
        normalizedEmail: 'test1@example.com',
        passwordHash: hash,
      });

      assert.strictEqual(user.username, 'TestPlayer1');
      assert.strictEqual(user.statistics.matchesPlayed, 0);
      assert.strictEqual(user.statistics.wins, 0);
      assert.strictEqual(user.statistics.totalCardsWon, 0);

      const isMatch = await user.comparePassword('securepassword123');
      assert.strictEqual(isMatch, true);

      const isWrong = await user.comparePassword('wrongpassword');
      assert.strictEqual(isWrong, false);
    });

    test('rejects duplicate normalized email and username', async () => {
      await assert.rejects(async () => {
        await User.create({
          username: 'TestPlayer1',
          normalizedUsername: 'testplayer1',
          email: 'another@example.com',
          normalizedEmail: 'another@example.com',
          passwordHash: 'dummy',
        });
      });
    });
  });

  // 3. MATCHMAKING SERVICE TESTS
  describe('Matchmaking Queue & Category Compatibility', () => {
    test('adds user to queue and detects exact category match', () => {
      // Clear queue
      matchmakingService.queue = [];

      const match1 = matchmakingService.addToQueue({
        userId: 'u1',
        socketId: 'sock1',
        username: 'PlayerOne',
        category: GAME_CONFIG.CATEGORIES.BOLLYWOOD_MOVIES,
      });
      assert.strictEqual(match1, null);
      assert.strictEqual(matchmakingService.getQueueLength(), 1);

      // Incompatible queue entry doesn't match
      const match2 = matchmakingService.addToQueue({
        userId: 'u2',
        socketId: 'sock2',
        username: 'PlayerTwo',
        category: GAME_CONFIG.CATEGORIES.BOLLYWOOD_SONGS,
      });
      assert.strictEqual(match2, null);
      assert.strictEqual(matchmakingService.getQueueLength(), 2);

      // Compatible movie player joins
      const match3 = matchmakingService.addToQueue({
        userId: 'u3',
        socketId: 'sock3',
        username: 'PlayerThree',
        category: GAME_CONFIG.CATEGORIES.BOLLYWOOD_MOVIES,
      });

      assert.notStrictEqual(match3, null);
      assert.strictEqual(match3.category, GAME_CONFIG.CATEGORIES.BOLLYWOOD_MOVIES);
      assert.strictEqual(match3.player1.userId, 'u1');
      assert.strictEqual(match3.player2.userId, 'u3');

      // Remaining in queue should only be u2 (songs)
      assert.strictEqual(matchmakingService.getQueueLength(), 1);
      assert.strictEqual(matchmakingService.queue[0].userId, 'u2');
    });

    test('cancels queue entry properly', () => {
      const removed = matchmakingService.removeFromQueue('u2');
      assert.notStrictEqual(removed, null);
      assert.strictEqual(matchmakingService.getQueueLength(), 0);
    });
  });

  // 4. SERVER-AUTHORITATIVE MATCH ENGINE TESTS
  describe('Match Service & Scoring', () => {
    test('creates match, processes answers, and updates statistics exactly once', async () => {
      // Create test card
      const card = await GameCard.create({
        category: 'bollywood_movies',
        clue: '🚂 ❤️ 👰',
        answer: 'Dilwale Dulhania Le Jayenge',
        normalizedAnswer: 'dilwale dulhania le jayenge',
        acceptedAnswers: ['DDLJ'],
        difficulty: 'easy',
        hint: 'Raj and Simran',
        isActive: true,
      });

      // Create two players in DB
      const userA = await User.create({
        username: 'WinnerUser',
        normalizedUsername: 'winneruser',
        email: 'winner@example.com',
        normalizedEmail: 'winner@example.com',
        passwordHash: 'dummy',
      });

      const userB = await User.create({
        username: 'RunnerUpUser',
        normalizedUsername: 'runnerupuser',
        email: 'runnerup@example.com',
        normalizedEmail: 'runnerup@example.com',
        passwordHash: 'dummy',
      });

      const matchState = await matchService.createMatch(
        { userId: userA._id, username: userA.username, socketId: 'sA' },
        { userId: userB._id, username: userB.username, socketId: 'sB' },
        'bollywood_movies',
        1 // 1 round for quick test
      );

      assert.strictEqual(matchState.currentRound, 0);
      assert.strictEqual(matchState.players[userA._id.toString()].score, 0);

      // Start match
      await matchService.startMatch(matchState.matchId);
      // Manually trigger round 1 with our test card
      matchState.currentCard = card;
      matchState.currentAnswer = card.answer;
      matchState.currentAcceptedAnswers = card.acceptedAnswers;
      matchState.currentRound = 1;
      matchState.roundStartTime = Date.now();
      matchState.roundEndTime = Date.now() + 20000;
      matchState.status = GAME_CONFIG.MATCH_STATUS.PLAYING;
      matchState.isRoundResolving = false;

      // Submit incorrect guess
      const wrongResult = await matchService.submitAnswer(matchState.matchId, userB._id, 'Lagaan');
      assert.strictEqual(wrongResult.correct, false);
      assert.strictEqual(matchState.players[userB._id.toString()].score, 0);

      // Submit correct guess from userA
      const correctResult = await matchService.submitAnswer(matchState.matchId, userA._id, 'DDLJ');
      assert.strictEqual(correctResult.correct, true);
      assert.strictEqual(matchState.players[userA._id.toString()].score, 1);

      // Subsequent attempt in same round must be rejected
      const lateResult = await matchService.submitAnswer(matchState.matchId, userB._id, 'Dilwale Dulhania Le Jayenge');
      assert.strictEqual(lateResult.correct, undefined); // error: round is already resolved

      // Complete match
      await matchService.completeMatch(matchState.matchId, GAME_CONFIG.COMPLETION_REASONS.ROUNDS_COMPLETED);

      // Verify winner in Match doc
      const savedMatch = await Match.findOne({ matchId: matchState.matchId });
      assert.strictEqual(savedMatch.status, GAME_CONFIG.MATCH_STATUS.COMPLETED);
      assert.strictEqual(savedMatch.winner.toString(), userA._id.toString());
      assert.strictEqual(savedMatch.statsUpdated, true);

      // Verify User statistics updated
      const updatedUserA = await User.findById(userA._id);
      assert.strictEqual(updatedUserA.statistics.matchesPlayed, 1);
      assert.strictEqual(updatedUserA.statistics.wins, 1);
      assert.strictEqual(updatedUserA.statistics.totalCardsWon, 1);
      assert.strictEqual(updatedUserA.statistics.winRate, 100);

      const updatedUserB = await User.findById(userB._id);
      assert.strictEqual(updatedUserB.statistics.matchesPlayed, 1);
      assert.strictEqual(updatedUserB.statistics.losses, 1);
      assert.strictEqual(updatedUserB.statistics.wins, 0);
      assert.strictEqual(updatedUserB.statistics.winRate, 0);

      // Calling completeMatch again must not inflate stats (idempotency check)
      await matchService.completeMatch(matchState.matchId, GAME_CONFIG.COMPLETION_REASONS.ROUNDS_COMPLETED);
      const recheckedUserA = await User.findById(userA._id);
      assert.strictEqual(recheckedUserA.statistics.matchesPlayed, 1); // still 1!
    });
  });
});
