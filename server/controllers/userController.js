const User = require('../models/User');

// @desc    Search users by username
// @route   GET /api/users/search?username=
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    const cleanQuery = username.trim().toLowerCase();

    // Find users whose normalizedUsername contains the query, excluding self
    const users = await User.find({
      normalizedUsername: { $regex: cleanQuery, $options: 'i' },
      _id: { $ne: req.user._id },
    })
      .limit(10)
      .select('username statistics createdAt');

    return res.status(200).json({
      success: true,
      users: users.map(u => u.toPublicProfile()),
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Get user public profile by ID
// @route   GET /api/users/:id/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    return next(err);
  }
};

// @desc    Update current user profile (username only)
// @route   PATCH /api/users/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'New username is required.' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({ success: false, message: 'Username must be between 3 and 20 characters.' });
    }

    const normalizedUsername = trimmedUsername.toLowerCase();

    // Check if new username is already taken by another user
    const existing = await User.findOne({
      normalizedUsername,
      _id: { $ne: req.user._id },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'This username is already taken.' });
    }

    // Authoritative update: update ONLY username and normalizedUsername
    req.user.username = trimmedUsername;
    req.user.normalizedUsername = normalizedUsername;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Username updated successfully.',
      user: req.user.toAuthUser(),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  searchUsers,
  getUserProfile,
  updateMe,
};
