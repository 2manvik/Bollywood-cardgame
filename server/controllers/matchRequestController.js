const MatchRequest = require('../models/MatchRequest');
const User = require('../models/User');
const GAME_CONFIG = require('../config/gameConfig');
const matchService = require('../services/matchService');

// @desc    Send a friend challenge
// @route   POST /api/match-requests
// @access  Private
const sendChallenge = async (req, res, next) => {
  try {
    const { recipientId, category } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required.' });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot challenge yourself.' });
    }

    if (!category || !GAME_CONFIG.ALLOWED_MATCH_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${GAME_CONFIG.ALLOWED_MATCH_CATEGORIES.join(', ')}`,
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found.' });
    }

    // Check if sender or recipient is already in an active match
    if (matchService.getUserActiveMatch(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You are currently in an active match.' });
    }
    if (matchService.getUserActiveMatch(recipientId)) {
      return res.status(400).json({ success: false, message: 'This player is currently in another match.' });
    }

    // Check for existing pending request between these two users
    const existingPending = await MatchRequest.findOne({
      $or: [
        { sender: req.user._id, recipient: recipientId, status: 'PENDING', expiresAt: { $gt: new Date() } },
        { sender: recipientId, recipient: req.user._id, status: 'PENDING', expiresAt: { $gt: new Date() } },
      ],
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'A challenge request is already pending between you and this player.',
      });
    }

    const expiresAt = new Date(Date.now() + GAME_CONFIG.CHALLENGE_EXPIRY_SECONDS * 1000);

    const challenge = await MatchRequest.create({
      sender: req.user._id,
      recipient: recipientId,
      selectedCategory: category,
      status: 'PENDING',
      expiresAt,
    });

    // Populate sender info
    await challenge.populate('sender', 'username statistics');
    await challenge.populate('recipient', 'username statistics');

    // Socket notification if recipient is online
    if (matchService.io) {
      matchService.io.to(`user_${recipientId}`).emit('challenge:received', {
        challengeId: challenge._id,
        sender: {
          id: req.user._id,
          username: req.user.username,
          statistics: req.user.statistics,
        },
        category,
        expiresAt,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Challenge sent successfully.',
      challenge,
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Get pending challenges for the current user
// @route   GET /api/match-requests/pending
// @access  Private
const getPendingChallenges = async (req, res, next) => {
  try {
    const now = new Date();

    const incoming = await MatchRequest.find({
      recipient: req.user._id,
      status: 'PENDING',
      expiresAt: { $gt: now },
    })
      .populate('sender', 'username statistics')
      .sort({ createdAt: -1 });

    const outgoing = await MatchRequest.find({
      sender: req.user._id,
      status: 'PENDING',
      expiresAt: { $gt: now },
    })
      .populate('recipient', 'username statistics')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      incoming,
      outgoing,
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Accept a friend challenge
// @route   PATCH /api/match-requests/:id/accept
// @access  Private
const acceptChallenge = async (req, res, next) => {
  try {
    const challenge = await MatchRequest.findById(req.params.id)
      .populate('sender', 'username statistics')
      .populate('recipient', 'username statistics');

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    if (challenge.recipient._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to accept this challenge.' });
    }

    if (challenge.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Challenge has already been ${challenge.status.toLowerCase()}.` });
    }

    if (challenge.isExpired()) {
      challenge.status = 'EXPIRED';
      await challenge.save();
      return res.status(400).json({ success: false, message: 'This challenge has expired.' });
    }

    // Check neither player is currently playing
    if (matchService.getUserActiveMatch(challenge.sender._id)) {
      return res.status(400).json({ success: false, message: 'The challenger is currently playing another match.' });
    }
    if (matchService.getUserActiveMatch(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You are currently in another active match.' });
    }

    // Create Match
    const p1 = {
      userId: challenge.sender._id,
      username: challenge.sender.username,
    };
    const p2 = {
      userId: req.user._id,
      username: req.user.username,
    };

    const matchState = await matchService.createMatch(p1, p2, challenge.selectedCategory);

    // Update challenge
    challenge.status = 'ACCEPTED';
    challenge.respondedAt = new Date();
    challenge.matchId = matchState.matchId;
    await challenge.save();

    // Notify both users through Socket.IO
    if (matchService.io) {
      matchService.io.to(`user_${challenge.sender._id}`).emit('challenge:accepted', {
        challengeId: challenge._id,
        matchId: matchState.matchId,
        category: challenge.selectedCategory,
        opponent: {
          id: req.user._id,
          username: req.user.username,
        },
      });

      matchService.io.to(`user_${req.user._id}`).emit('challenge:accepted', {
        challengeId: challenge._id,
        matchId: matchState.matchId,
        category: challenge.selectedCategory,
        opponent: {
          id: challenge.sender._id,
          username: challenge.sender.username,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Challenge accepted! Match initialized.',
      matchId: matchState.matchId,
      match: matchState,
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Reject a friend challenge
// @route   PATCH /api/match-requests/:id/reject
// @access  Private
const rejectChallenge = async (req, res, next) => {
  try {
    const challenge = await MatchRequest.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    if (challenge.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this challenge.' });
    }

    if (challenge.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Challenge has already been ${challenge.status.toLowerCase()}.` });
    }

    challenge.status = 'REJECTED';
    challenge.respondedAt = new Date();
    await challenge.save();

    if (matchService.io) {
      matchService.io.to(`user_${challenge.sender}`).emit('challenge:rejected', {
        challengeId: challenge._id,
        rejectedBy: req.user.username,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Challenge rejected.',
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Cancel a friend challenge sent by current user
// @route   DELETE /api/match-requests/:id
// @access  Private
const cancelChallenge = async (req, res, next) => {
  try {
    const challenge = await MatchRequest.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    if (challenge.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this challenge.' });
    }

    challenge.status = 'CANCELLED';
    challenge.respondedAt = new Date();
    await challenge.save();

    if (matchService.io) {
      matchService.io.to(`user_${challenge.recipient}`).emit('challenge:cancelled', {
        challengeId: challenge._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Challenge cancelled successfully.',
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  sendChallenge,
  getPendingChallenges,
  acceptChallenge,
  rejectChallenge,
  cancelChallenge,
};
