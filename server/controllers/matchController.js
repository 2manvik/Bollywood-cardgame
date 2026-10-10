const Match = require('../models/Match');
const matchService = require('../services/matchService');

// @desc    Get match history for current authenticated user
// @route   GET /api/matches/history
// @access  Private
const getMatchHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const matches = await Match.find({
      'players.user': userId,
      status: { $in: ['COMPLETED', 'ABANDONED'] },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('players.user', 'username statistics')
      .populate('winner', 'username');

    const formattedMatches = matches.map(m => {
      const isPlayer1 = m.players[0].user && m.players[0].user._id.toString() === userId.toString();
      const userPlayer = isPlayer1 ? m.players[0] : m.players[1];
      const opponentPlayer = isPlayer1 ? m.players[1] : m.players[0];

      let outcome = 'DRAW';
      if (m.winner) {
        outcome = m.winner._id.toString() === userId.toString() ? 'WIN' : 'LOSS';
      } else if (m.status === 'ABANDONED') {
        outcome = 'ABANDONED';
      }

      return {
        id: m._id,
        matchId: m.matchId,
        category: m.category,
        date: m.createdAt,
        userScore: userPlayer ? userPlayer.score : 0,
        opponentScore: opponentPlayer ? opponentPlayer.score : 0,
        opponentUsername: opponentPlayer ? opponentPlayer.username : 'Unknown Opponent',
        outcome,
        totalRounds: m.configuredRounds,
        roundsPlayed: m.currentRound,
        duration: m.duration || 0,
        status: m.status,
      };
    });

    return res.status(200).json({
      success: true,
      matches: formattedMatches,
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Get match details by matchId
// @route   GET /api/matches/:matchId
// @access  Private
const getMatchDetails = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findOne({ matchId })
      .populate('players.user', 'username statistics')
      .populate('winner', 'username')
      .populate('roundHistory.card', 'clue category answer');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    // Verify user is one of the players
    const isParticipant = match.players.some(
      p => p.user && p.user._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this match.' });
    }

    return res.status(200).json({
      success: true,
      match,
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Get current user's active match if any
// @route   GET /api/matches/active
// @access  Private
const getActiveMatch = async (req, res, next) => {
  try {
    const active = matchService.getUserActiveMatch(req.user._id);

    if (!active) {
      return res.status(200).json({ success: true, activeMatch: null });
    }

    return res.status(200).json({
      success: true,
      activeMatch: {
        matchId: active.matchId,
        status: active.status,
        category: active.category,
        configuredRounds: active.configuredRounds,
        currentRound: active.currentRound,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMatchHistory,
  getMatchDetails,
  getActiveMatch,
};
