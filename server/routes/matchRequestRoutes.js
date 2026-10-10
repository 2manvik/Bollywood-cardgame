const express = require('express');
const router = express.Router();
const {
  sendChallenge,
  getPendingChallenges,
  acceptChallenge,
  rejectChallenge,
  cancelChallenge,
} = require('../controllers/matchRequestController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', sendChallenge);
router.get('/pending', getPendingChallenges);
router.patch('/:id/accept', acceptChallenge);
router.patch('/:id/reject', rejectChallenge);
router.delete('/:id', cancelChallenge);

module.exports = router;
