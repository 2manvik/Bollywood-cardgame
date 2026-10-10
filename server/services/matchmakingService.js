const GAME_CONFIG = require('../config/gameConfig');

class MatchmakingService {
  constructor() {
    // Array of { userId, socketId, username, category, joinedAt }
    this.queue = [];
  }

  /**
   * Adds a user to the matchmaking queue
   */
  addToQueue(player) {
    // Remove if already in queue to prevent duplicate entries
    this.removeFromQueue(player.userId);

    const entry = {
      userId: player.userId.toString(),
      socketId: player.socketId,
      username: player.username,
      category: player.category || GAME_CONFIG.CATEGORIES.RANDOM_MIX,
      joinedAt: Date.now(),
    };

    this.queue.push(entry);
    console.log(`[Matchmaking] Added ${entry.username} (${entry.category}) to queue. Current queue size: ${this.queue.length}`);
    return this.findMatch(entry.userId);
  }

  /**
   * Removes a user from queue by userId
   */
  removeFromQueue(userId) {
    const idStr = userId.toString();
    const index = this.queue.findIndex(item => item.userId === idStr);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`[Matchmaking] Removed ${removed.username} from queue. Queue size: ${this.queue.length}`);
      return removed;
    }
    return null;
  }

  /**
   * Removes a user from queue by socketId
   */
  removeBySocketId(socketId) {
    const index = this.queue.findIndex(item => item.socketId === socketId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`[Matchmaking] Removed socket ${socketId} (${removed.username}) from queue.`);
      return removed;
    }
    return null;
  }

  /**
   * Checks if a user is currently in the queue
   */
  isInQueue(userId) {
    const idStr = userId.toString();
    return this.queue.some(item => item.userId === idStr);
  }

  /**
   * Finds a compatible opponent for the specified user
   * Policy:
   * 1. Exact category match first
   * 2. Compatibility:
   *    - Movies + Movies -> Movies
   *    - Songs + Songs -> Songs
   *    - Random Mix + Random Mix -> Random Mix
   *    - Random Mix + Movies -> Random Mix accepts Movies, or Movies accepts Random Mix if no exact match
   *    - Exact preference is preferred.
   */
  findMatch(currentUserId) {
    const playerIndex = this.queue.findIndex(item => item.userId === currentUserId);
    if (playerIndex === -1) return null;

    const player = this.queue[playerIndex];

    // Look for exact match first
    for (let i = 0; i < this.queue.length; i++) {
      if (i === playerIndex) continue;
      const candidate = this.queue[i];

      if (candidate.category === player.category) {
        // Exact match found!
        const earlierIndex = Math.min(playerIndex, i);
        const laterIndex = Math.max(playerIndex, i);
        const [laterPlayer] = this.queue.splice(laterIndex, 1);
        const [earlierPlayer] = this.queue.splice(earlierIndex, 1);
        return {
          player1: earlierPlayer,
          player2: laterPlayer,
          category: player.category,
        };
      }
    }

    // No exact match found, wait in queue
    return null;
  }

  getQueueLength() {
    return this.queue.length;
  }
}

// Singleton instance
module.exports = new MatchmakingService();
