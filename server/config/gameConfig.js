const GAME_CONFIG = {
  DEFAULT_ROUNDS: 20,
  ROUND_TIME_LIMIT: 20, // 20 seconds per round for guessing
  ROUND_DISPLAY_DELAY: 4, // 4 seconds to view result before next round starts
  CHALLENGE_EXPIRY_SECONDS: 120, // 2 minutes before friend challenge expires
  RECONNECT_GRACE_PERIOD: 30, // 30 seconds for disconnected player to reconnect
  CATEGORIES: {
    BOLLYWOOD_MOVIES: 'bollywood_movies',
    BOLLYWOOD_SONGS: 'bollywood_songs',
    RANDOM_MIX: 'random_mix',
  },
  ALLOWED_CONTENT_CATEGORIES: ['bollywood_movies', 'bollywood_songs'],
  ALLOWED_MATCH_CATEGORIES: ['bollywood_movies', 'bollywood_songs', 'random_mix'],
  DIFFICULTIES: ['easy', 'medium', 'hard'],
  MATCH_STATUS: {
    WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
    WAITING_FOR_READY: 'WAITING_FOR_READY',
    PLAYING: 'PLAYING',
    ROUND_RESOLVED: 'ROUND_RESOLVED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ABANDONED: 'ABANDONED',
  },
  COMPLETION_REASONS: {
    ROUNDS_COMPLETED: 'ROUNDS_COMPLETED',
    CARDS_EXHAUSTED: 'CARDS_EXHAUSTED',
    PLAYER_ABANDONED: 'PLAYER_ABANDONED',
    CANCELLED: 'CANCELLED',
  },
};

module.exports = GAME_CONFIG;
