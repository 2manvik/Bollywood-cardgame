const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/cardController');

router.get('/categories', getCategories);

module.exports = router;
