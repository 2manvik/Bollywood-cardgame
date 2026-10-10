const Match = require('../models/Match');
const User = require('../models/User');
const GameCard = require('../models/GameCard');
const GAME_CONFIG = require('../config/gameConfig');
const { isAnswerCorrect } = require('../utils/answerValidator');

class MatchService {
  constructor() {
    // Map<matchId, MatchState>
    this.activeMatches = new Map();
    this.io = null;
  }

  setIo(ioInstance) {
    this.io = ioInstance;
  }

  /**
   * Generates a unique match identifier
   */
  generateMatchId() {
    return `match_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Initializes a new match with two players
   */
  async createMatch(player1, player2, category, configuredRounds = GAME_CONFIG.DEFAULT_ROUNDS) {
    const matchId = this.generateMatchId();

    const p1Id = player1.userId.toString();
    const p2Id = player2.userId.toString();

    // Persist match in MongoDB
    const matchDoc = await Match.create({
      matchId,
      players: [
        { user: p1Id, username: player1.username, score: 0, ready: false, connected: true },
        { user: p2Id, username: player2.username, score: 0, ready: false, connected: true },
      ],
      category,
      configuredRounds,
      status: GAME_CONFIG.MATCH_STATUS.WAITING_FOR_READY,
      scores: new Map([
        [p1Id, 0],
        [p2Id, 0],
      ]),
      usedCardIds: [],
      roundHistory: [],
    });

    const matchState = {
      matchId,
      mongoId: matchDoc._id,
      category,
      configuredRounds,
      currentRound: 0,
      status: GAME_CONFIG.MATCH_STATUS.WAITING_FOR_READY,
      players: {
        [p1Id]: {
          userId: p1Id,
          username: player1.username,
          score: 0,
          ready: false,
          connected: true,
          socketId: player1.socketId,
        },
        [p2Id]: {
          userId: p2Id,
          username: player2.username,
          score: 0,
          ready: false,
          connected: true,
          socketId: player2.socketId,
        },
      },
      usedCardIds: new Set(),
      currentCard: null,
      currentAnswer: null,
      currentAcceptedAnswers: [],
      roundTimer: null,
      roundStartTime: null,
      roundEndTime: null,
      isRoundResolving: false,
      reconnectTimers: new Map(),
      createdAt: Date.now(),
      startTime: null,
    };

    this.activeMatches.set(matchId, matchState);
    console.log(`[MatchService] Created match ${matchId} for ${player1.username} & ${player2.username} (${category})`);
    return matchState;
  }

  /**
   * Retrieves active in-memory match state
   */
  getMatch(matchId) {
    return this.activeMatches.get(matchId);
  }

  /**
   * Checks if a user is currently in an active playing or waiting match
   */
  getUserActiveMatch(userId) {
    const idStr = userId.toString();
    for (const match of this.activeMatches.values()) {
      if (
        (match.status === GAME_CONFIG.MATCH_STATUS.WAITING_FOR_READY ||
         match.status === GAME_CONFIG.MATCH_STATUS.PLAYING ||
         match.status === GAME_CONFIG.MATCH_STATUS.ROUND_RESOLVED) &&
        Boolean(match.players[idStr])
      ) {
        return match;
      }
    }
    return null;
  }

  /**
   * Handles player ready toggle in lobby
   */
  async setPlayerReady(matchId, userId, ready = true) {
    const match = this.getMatch(matchId);
    if (!match) return { error: 'Match not found.' };

    const idStr = userId.toString();
    if (!match.players[idStr]) return { error: 'Player does not belong to this match.' };

    match.players[idStr].ready = ready;

    const allReady = Object.values(match.players).every(p => p.ready);

    return { match, allReady };
  }

  /**
   * Starts the match when both players are ready
   */
  async startMatch(matchId) {
    const match = this.getMatch(matchId);
    if (!match) return;

    if (match.status !== GAME_CONFIG.MATCH_STATUS.WAITING_FOR_READY) {
      console.warn(`[MatchService] Cannot start match ${matchId}: current status is ${match.status}`);
      return;
    }

    match.status = GAME_CONFIG.MATCH_STATUS.PLAYING;
    match.startTime = Date.now();

    await Match.updateOne(
      { matchId },
      { status: GAME_CONFIG.MATCH_STATUS.PLAYING, startTime: new Date(match.startTime) }
    );

    if (this.io) {
      this.io.to(matchId).emit('game:started', {
        matchId,
        configuredRounds: match.configuredRounds,
        category: match.category,
        players: Object.values(match.players).map(p => ({
          userId: p.userId,
          username: p.username,
          score: p.score,
        })),
      });
    }

    // Start round 1 after 1 second
    setTimeout(() => {
      this.startNextRound(matchId);
    }, 1000);
  }

  /**
   * Selects an unused card and starts a new round
   */
  async startNextRound(matchId) {
    const match = this.getMatch(matchId);
    if (!match) return;

    // Check if match is already completed or cancelled
    if (match.status === GAME_CONFIG.MATCH_STATUS.COMPLETED || match.status === GAME_CONFIG.MATCH_STATUS.ABANDONED) {
      return;
    }

    // Check if round limit reached
    if (match.currentRound >= match.configuredRounds) {
      await this.completeMatch(matchId, GAME_CONFIG.COMPLETION_REASONS.ROUNDS_COMPLETED);
      return;
    }

    // Build query for selecting unused card
    const query = {
      isActive: true,
      _id: { $nin: Array.from(match.usedCardIds) },
    };

    if (match.category === GAME_CONFIG.CATEGORIES.BOLLYWOOD_MOVIES) {
      query.category = GAME_CONFIG.CATEGORIES.BOLLYWOOD_MOVIES;
    } else if (match.category === GAME_CONFIG.CATEGORIES.BOLLYWOOD_SONGS) {
      query.category = GAME_CONFIG.CATEGORIES.BOLLYWOOD_SONGS;
    } else {
      // Random mix: choose from either category
      query.category = { $in: GAME_CONFIG.ALLOWED_CONTENT_CATEGORIES };
    }

    const availableCards = await GameCard.find(query);

    if (availableCards.length === 0) {
      console.log(`[MatchService] Question bank exhausted for match ${matchId}. Finishing match.`);
      await this.completeMatch(matchId, GAME_CONFIG.COMPLETION_REASONS.CARDS_EXHAUSTED);
      return;
    }

    // Select random card
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const selectedCard = availableCards[randomIndex];

    match.usedCardIds.add(selectedCard._id);
    match.currentRound += 1;
    match.currentCard = selectedCard;
    match.currentAnswer = selectedCard.answer;
    match.currentAcceptedAnswers = selectedCard.acceptedAnswers || [];
    match.status = GAME_CONFIG.MATCH_STATUS.PLAYING;
    match.isRoundResolving = false;

    const duration = GAME_CONFIG.ROUND_TIME_LIMIT;
    match.roundStartTime = Date.now();
    match.roundEndTime = match.roundStartTime + duration * 1000;

    // Set server-side timer for timeout
    if (match.roundTimer) clearTimeout(match.roundTimer);
    match.roundTimer = setTimeout(() => {
      this.handleRoundTimeout(matchId, match.currentRound);
    }, duration * 1000);

    const publicCard = selectedCard.toPublicClue();

    if (this.io) {
      this.io.to(matchId).emit('round:started', {
        matchId,
        roundNumber: match.currentRound,
        totalRounds: match.configuredRounds,
        card: publicCard,
        startTime: match.roundStartTime,
        duration,
        scores: this.getScoresMap(match),
      });
    }

    console.log(`[MatchService] Match ${matchId} Round ${match.currentRound}/${match.configuredRounds} started. Clue: ${selectedCard.clue} (Answer hidden)`);
  }

  /**
   * Processes player answer submission authoritatively
   */
  async submitAnswer(matchId, userId, guess) {
    const match = this.getMatch(matchId);
    if (!match) return { error: 'Match not found.' };

    const idStr = userId.toString();
    const player = match.players[idStr];
    if (!player) return { error: 'Player does not belong to this match.' };

    if (match.status !== GAME_CONFIG.MATCH_STATUS.PLAYING) {
      return { error: 'Match is not currently accepting answers.' };
    }

    if (Date.now() > match.roundEndTime) {
      return { error: 'Round deadline has expired.' };
    }

    if (match.isRoundResolving) {
      return { error: 'Round is already resolved.' };
    }

    const isCorrect = isAnswerCorrect(
      guess,
      match.currentAnswer,
      match.currentAcceptedAnswers
    );

    if (!isCorrect) {
      // Wrong guess: notify only this player so they can retry
      return {
        correct: false,
        guess,
        message: 'Incorrect guess. Try again!',
      };
    }

    // Atomic round resolution lock! Concurrency safe.
    match.isRoundResolving = true;
    if (match.roundTimer) {
      clearTimeout(match.roundTimer);
      match.roundTimer = null;
    }
    match.status = GAME_CONFIG.MATCH_STATUS.ROUND_RESOLVED;

    // Award card to player
    player.score += 1;

    const roundRecord = {
      roundNumber: match.currentRound,
      card: match.currentCard._id,
      clue: match.currentCard.clue,
      category: match.currentCard.category,
      answer: match.currentAnswer,
      winner: player.userId,
      winnerUsername: player.username,
      winnerGuess: guess,
      timeTaken: Number(((Date.now() - match.roundStartTime) / 1000).toFixed(1)),
      resolvedReason: 'CORRECT_ANSWER',
    };

    // Update match document in MongoDB
    await Match.updateOne(
      { matchId },
      {
        $inc: { [`players.$[elem].score`]: 1 },
        $push: { roundHistory: roundRecord, usedCardIds: match.currentCard._id },
        $set: {
          currentRound: match.currentRound,
          [`scores.${idStr}`]: player.score,
        },
      },
      { arrayFilters: [{ 'elem.user': player.userId }] }
    );

    const scores = this.getScoresMap(match);

    // Broadcast winner and reveal answer
    if (this.io) {
      this.io.to(matchId).emit('round:resolved', {
        matchId,
        roundNumber: match.currentRound,
        correct: true,
        winnerId: player.userId,
        winnerUsername: player.username,
        answer: match.currentAnswer,
        timeTaken: roundRecord.timeTaken,
        scores,
        resolvedReason: 'CORRECT_ANSWER',
      });
    }

    console.log(`[MatchService] Match ${matchId} Round ${match.currentRound} won by ${player.username} ("${match.currentAnswer}")`);

    // Wait display delay before next round
    if (match.nextRoundTimer) clearTimeout(match.nextRoundTimer);
    match.nextRoundTimer = setTimeout(() => {
      this.startNextRound(matchId);
    }, GAME_CONFIG.ROUND_DISPLAY_DELAY * 1000);

    return {
      correct: true,
      winnerUsername: player.username,
    };
  }

  /**
   * Handles round timeout when no player guesses correctly
   */
  async handleRoundTimeout(matchId, roundNumber) {
    const match = this.getMatch(matchId);
    if (!match) return;

    if (match.currentRound !== roundNumber || match.status !== GAME_CONFIG.MATCH_STATUS.PLAYING) {
      return;
    }

    match.isRoundResolving = true;
    match.status = GAME_CONFIG.MATCH_STATUS.ROUND_RESOLVED;

    const roundRecord = {
      roundNumber: match.currentRound,
      card: match.currentCard._id,
      clue: match.currentCard.clue,
      category: match.currentCard.category,
      answer: match.currentAnswer,
      winner: null,
      winnerUsername: null,
      winnerGuess: null,
      timeTaken: GAME_CONFIG.ROUND_TIME_LIMIT,
      resolvedReason: 'TIMEOUT',
    };

    await Match.updateOne(
      { matchId },
      {
        $push: { roundHistory: roundRecord, usedCardIds: match.currentCard._id },
        $set: { currentRound: match.currentRound },
      }
    );

    const scores = this.getScoresMap(match);

    if (this.io) {
      this.io.to(matchId).emit('round:resolved', {
        matchId,
        roundNumber: match.currentRound,
        correct: false,
        winnerId: null,
        winnerUsername: null,
        answer: match.currentAnswer,
        scores,
        resolvedReason: 'TIMEOUT',
      });
    }

    console.log(`[MatchService] Match ${matchId} Round ${match.currentRound} timed out. Answer was "${match.currentAnswer}"`);

    if (match.nextRoundTimer) clearTimeout(match.nextRoundTimer);
    match.nextRoundTimer = setTimeout(() => {
      this.startNextRound(matchId);
    }, GAME_CONFIG.ROUND_DISPLAY_DELAY * 1000);
  }

  /**
   * Completes the match, records winner, and updates stats exactly once
   */
  async completeMatch(matchId, completionReason = GAME_CONFIG.COMPLETION_REASONS.ROUNDS_COMPLETED) {
    const match = this.getMatch(matchId);
    if (!match) return;

    if (match.status === GAME_CONFIG.MATCH_STATUS.COMPLETED) return;
    match.status = GAME_CONFIG.MATCH_STATUS.COMPLETED;

    if (match.roundTimer) {
      clearTimeout(match.roundTimer);
      match.roundTimer = null;
    }

    if (match.nextRoundTimer) {
      clearTimeout(match.nextRoundTimer);
      match.nextRoundTimer = null;
    }

    for (const timer of match.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    match.reconnectTimers.clear();

    const playerList = Object.values(match.players);
    const p1 = playerList[0];
    const p2 = playerList[1];

    let winnerId = null;
    let winnerUsername = null;
    let isDraw = false;

    if (p1.score > p2.score) {
      winnerId = p1.userId;
      winnerUsername = p1.username;
    } else if (p2.score > p1.score) {
      winnerId = p2.userId;
      winnerUsername = p2.username;
    } else {
      isDraw = true;
    }

    const endTime = Date.now();
    const duration = match.startTime ? Math.round((endTime - match.startTime) / 1000) : 0;

    // Atomically update Match document and mark statsUpdated
    const updatedMatch = await Match.findOneAndUpdate(
      { matchId, statsUpdated: false },
      {
        $set: {
          status: GAME_CONFIG.MATCH_STATUS.COMPLETED,
          winner: winnerId,
          winnerUsername,
          isDraw,
          endTime: new Date(endTime),
          duration,
          completionReason,
          statsUpdated: true,
          'players.0.score': p1.score,
          'players.1.score': p2.score,
        },
      },
      { new: true }
    );

    // Update player statistics exactly once
    if (updatedMatch) {
      await this.updatePlayerStats(p1.userId, p1.score, winnerId === p1.userId, isDraw);
      await this.updatePlayerStats(p2.userId, p2.score, winnerId === p2.userId, isDraw);
      console.log(`[MatchService] Match ${matchId} statistics persisted to database for both players.`);
    }

    const summary = {
      matchId,
      players: playerList.map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
      })),
      winnerId,
      winnerUsername,
      isDraw,
      totalRoundsPlayed: match.currentRound,
      duration,
      completionReason,
      scores: this.getScoresMap(match),
      category: match.category,
    };

    if (this.io) {
      this.io.to(matchId).emit('game:completed', summary);
    }

    console.log(`[MatchService] Match ${matchId} completed! Winner: ${winnerUsername || 'DRAW'} (${p1.username}: ${p1.score}, ${p2.username}: ${p2.score})`);

    // Clean up active in-memory match after 5 minutes
    setTimeout(() => {
      this.activeMatches.delete(matchId);
    }, 5 * 60 * 1000);

    return summary;
  }

  /**
   * Safely updates a user's authoritative statistics
   */
  async updatePlayerStats(userId, cardsWon, isWinner, isDraw) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const newMatchesPlayed = (user.statistics.matchesPlayed || 0) + 1;
      const newWins = (user.statistics.wins || 0) + (isWinner ? 1 : 0);
      const newLosses = (user.statistics.losses || 0) + (!isWinner && !isDraw ? 1 : 0);
      const newDraws = (user.statistics.draws || 0) + (isDraw ? 1 : 0);
      const newCards = (user.statistics.totalCardsWon || 0) + cardsWon;
      const newWinRate = newMatchesPlayed > 0 ? Number(((newWins / newMatchesPlayed) * 100).toFixed(1)) : 0;

      await User.findByIdAndUpdate(userId, {
        $set: {
          'statistics.matchesPlayed': newMatchesPlayed,
          'statistics.wins': newWins,
          'statistics.losses': newLosses,
          'statistics.draws': newDraws,
          'statistics.totalCardsWon': newCards,
          'statistics.winRate': newWinRate,
        },
      });
    } catch (err) {
      console.error(`[MatchService Error] Failed to update statistics for user ${userId}:`, err);
    }
  }

  /**
   * Handles player disconnection during lobby or game
   */
  handleDisconnection(userId, socketId) {
    const idStr = userId.toString();

    for (const match of this.activeMatches.values()) {
      if (match.players[idStr] && match.players[idStr].socketId === socketId) {
        match.players[idStr].connected = false;

        console.log(`[MatchService] Player ${match.players[idStr].username} disconnected from match ${match.matchId} (Status: ${match.status})`);

        if (match.status === GAME_CONFIG.MATCH_STATUS.WAITING_FOR_READY) {
          // In lobby: notify opponent
          if (this.io) {
            this.io.to(match.matchId).emit('lobby:player-left', {
              userId: idStr,
              username: match.players[idStr].username,
            });
          }
          // Set grace period to cancel lobby
          const timer = setTimeout(() => {
            if (!match.players[idStr].connected) {
              match.status = GAME_CONFIG.MATCH_STATUS.CANCELLED;
              Match.updateOne({ matchId: match.matchId }, { status: GAME_CONFIG.MATCH_STATUS.CANCELLED }).exec();
              this.activeMatches.delete(match.matchId);
            }
          }, GAME_CONFIG.RECONNECT_GRACE_PERIOD * 1000);
          match.reconnectTimers.set(idStr, timer);
        } else if (
          match.status === GAME_CONFIG.MATCH_STATUS.PLAYING ||
          match.status === GAME_CONFIG.MATCH_STATUS.ROUND_RESOLVED
        ) {
          // In active game: notify opponent with grace period
          if (this.io) {
            this.io.to(match.matchId).emit('player:disconnected', {
              userId: idStr,
              username: match.players[idStr].username,
              gracePeriodSeconds: GAME_CONFIG.RECONNECT_GRACE_PERIOD,
            });
          }

          const timer = setTimeout(async () => {
            if (!match.players[idStr].connected) {
              console.log(`[MatchService] Grace period expired for ${match.players[idStr].username} in match ${match.matchId}. Match abandoned.`);
              if (this.io) {
                this.io.to(match.matchId).emit('match:abandoned', {
                  abandonedBy: idStr,
                  abandonedUsername: match.players[idStr].username,
                });
              }
              await this.completeMatch(match.matchId, GAME_CONFIG.COMPLETION_REASONS.PLAYER_ABANDONED);
            }
          }, GAME_CONFIG.RECONNECT_GRACE_PERIOD * 1000);

          match.reconnectTimers.set(idStr, timer);
        }
      }
    }
  }

  /**
   * Handles player reconnection and restores match state
   */
  handleReconnection(matchId, userId, newSocketId) {
    const match = this.getMatch(matchId);
    if (!match) return null;

    const idStr = userId.toString();
    const player = match.players[idStr];
    if (!player) return null;

    // Clear reconnect timer
    if (match.reconnectTimers.has(idStr)) {
      clearTimeout(match.reconnectTimers.get(idStr));
      match.reconnectTimers.delete(idStr);
    }

    player.connected = true;
    player.socketId = newSocketId;

    if (this.io) {
      this.io.to(matchId).emit('player:reconnected', {
        userId: idStr,
        username: player.username,
      });
    }

    console.log(`[MatchService] Player ${player.username} reconnected to match ${matchId}`);

    const remainingTime = Math.max(0, Math.round((match.roundEndTime - Date.now()) / 1000));

    return {
      matchId: match.matchId,
      status: match.status,
      currentRound: match.currentRound,
      configuredRounds: match.configuredRounds,
      category: match.category,
      card: match.currentCard ? match.currentCard.toPublicClue() : null,
      remainingTime,
      scores: this.getScoresMap(match),
      players: Object.values(match.players).map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
        ready: p.ready,
      })),
    };
  }

  clearMatch(matchId) {
    const match = this.getMatch(matchId);
    if (match) {
      if (match.roundTimer) clearTimeout(match.roundTimer);
      if (match.nextRoundTimer) clearTimeout(match.nextRoundTimer);
      for (const timer of match.reconnectTimers.values()) {
        clearTimeout(timer);
      }
      match.reconnectTimers.clear();
      this.activeMatches.delete(matchId);
    }
  }

  getScoresMap(match) {
    const map = {};
    for (const p of Object.values(match.players)) {
      map[p.userId] = p.score;
    }
    return map;
  }
}

// Singleton instance
module.exports = new MatchService();
