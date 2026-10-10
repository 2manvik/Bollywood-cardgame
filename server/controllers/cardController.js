const GameCard = require('../models/GameCard');
const GAME_CONFIG = require('../config/gameConfig');

// @desc    Get available categories and card statistics
// @route   GET /api/cards/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const movieCount = await GameCard.countDocuments({
      category: GAME_CONFIG.CATEGORIES.BOLLYWOOD_MOVIES,
      isActive: true,
    });

    const songCount = await GameCard.countDocuments({
      category: GAME_CONFIG.CATEGORIES.BOLLYWOOD_SONGS,
      isActive: true,
    });

    const categories = [
      {
        id: GAME_CONFIG.CATEGORIES.BOLLYWOOD_MOVIES,
        name: 'Bollywood Movies',
        tagline: 'Iconic Cinema Clues',
        description: 'Decode Bollywood blockbuster and cult-classic movie titles using clever emoji combinations.',
        badge: 'Movies',
        icon: '🎬',
        cardCount: movieCount,
      },
      {
        id: GAME_CONFIG.CATEGORIES.BOLLYWOOD_SONGS,
        name: 'Bollywood Songs',
        tagline: 'Melody & Dance Hits',
        description: 'Identify legendary romantic tracks, item songs, and chartbusters from pictorial clues.',
        badge: 'Songs',
        icon: '🎵',
        cardCount: songCount,
      },
      {
        id: GAME_CONFIG.CATEGORIES.RANDOM_MIX,
        name: 'Random Mix',
        tagline: 'The Ultimate Bollywood Showdown',
        description: 'Test your all-round Bollywood quotient with an alternating mixture of movie and song cards.',
        badge: 'Mix',
        icon: '🎲',
        cardCount: movieCount + songCount,
      },
    ];

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getCategories,
};
