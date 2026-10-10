const express = require('express');
const router = express.Router();
const { getMatchHistory, getMatchDetails, getActiveMatch } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/history', getMatchHistory);
router.get('/active', getActiveMatch);
router.get('/:matchId', getMatchDetails);

module.exports = router;
