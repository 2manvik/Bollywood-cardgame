const express = require('express');
const router = express.Router();
const { searchUsers, getUserProfile, updateMe } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchUsers);
router.get('/:id/profile', protect, getUserProfile);
router.patch('/me', protect, updateMe);

module.exports = router;
