const matchmakingService = require('../services/matchmakingService');
const matchService = require('../services/matchService');
const GAME_CONFIG = require('../config/gameConfig');

module.exports = function registerGameHandlers(io, socket) {
  const user = socket.user;
  const userIdStr = user._id.toString();

  // Join personal user room for direct notifications (friend challenges, etc.)
  socket.join(`user_${userIdStr}`);
  console.log(`[Socket] User ${user.username} (${userIdStr}) connected. Socket ID: ${socket.id}`);

  // 1. MATCHMAKING: JOIN QUEUE
  socket.on('matchmaking:join', async (data, callback) => {
    try {
      const category = data?.category || GAME_CONFIG.CATEGORIES.RANDOM_MIX;

      if (!GAME_CONFIG.ALLOWED_MATCH_CATEGORIES.includes(category)) {
        const errorMsg = 'Invalid category selected for matchmaking.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        return socket.emit('matchmaking:error', { message: errorMsg });
      }

      // Check if user is already in an active match
      const existingActive = matchService.getUserActiveMatch(userIdStr);
      if (existingActive) {
        const errorMsg = 'You are already in an active match.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        return socket.emit('matchmaking:error', { message: errorMsg, matchId: existingActive.matchId });
      }

      const matchFound = matchmakingService.addToQueue({
        userId: userIdStr,
        socketId: socket.id,
        username: user.username,
        category,
      });

      if (typeof callback === 'function') {
        callback({ success: true, queued: !matchFound });
      }

      if (matchFound) {
        // Create match in matchService
        const matchState = await matchService.createMatch(
          matchFound.player1,
          matchFound.player2,
          matchFound.category
        );

        // Fetch sockets for both players
        const s1 = io.sockets.sockets.get(matchFound.player1.socketId);
        const s2 = io.sockets.sockets.get(matchFound.player2.socketId);

        if (s1) s1.join(matchState.matchId);
        if (s2) s2.join(matchState.matchId);

        // Notify player 1
        io.to(`user_${matchFound.player1.userId}`).emit('matchmaking:found', {
          matchId: matchState.matchId,
          category: matchState.category,
          opponent: {
            id: matchFound.player2.userId,
            username: matchFound.player2.username,
          },
        });

        // Notify player 2
        io.to(`user_${matchFound.player2.userId}`).emit('matchmaking:found', {
          matchId: matchState.matchId,
          category: matchState.category,
          opponent: {
            id: matchFound.player1.userId,
            username: matchFound.player1.username,
          },
        });

        console.log(`[Matchmaking] Match found! Created ${matchState.matchId} between ${matchFound.player1.username} and ${matchFound.player2.username}`);
      }
    } catch (err) {
      console.error('[Socket Error] matchmaking:join:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      socket.emit('matchmaking:error', { message: 'Server error while joining queue.' });
    }
  });

  // 2. MATCHMAKING: CANCEL QUEUE
  socket.on('matchmaking:cancel', (data, callback) => {
    try {
      const removed = matchmakingService.removeFromQueue(userIdStr);
      if (typeof callback === 'function') callback({ success: true, cancelled: Boolean(removed) });
      socket.emit('matchmaking:cancelled', { success: true });
    } catch (err) {
      console.error('[Socket Error] matchmaking:cancel:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 3. LOBBY: JOIN
  socket.on('lobby:join', async (data, callback) => {
    try {
      const { matchId } = data || {};
      if (!matchId) {
        if (typeof callback === 'function') callback({ success: false, error: 'Match ID required' });
        return;
      }

      const match = matchService.getMatch(matchId);
      if (!match) {
        if (typeof callback === 'function') callback({ success: false, error: 'Match not found or expired.' });
        return;
      }

      if (!match.players[userIdStr]) {
        if (typeof callback === 'function') callback({ success: false, error: 'You are not a participant in this match.' });
        return;
      }

      // Associate new socket with player and join room
      match.players[userIdStr].socketId = socket.id;
      match.players[userIdStr].connected = true;
      socket.join(matchId);

      const lobbyData = {
        matchId: match.matchId,
        category: match.category,
        configuredRounds: match.configuredRounds,
        status: match.status,
        players: Object.values(match.players).map(p => ({
          userId: p.userId,
          username: p.username,
          ready: p.ready,
          connected: p.connected,
          score: p.score,
        })),
      };

      if (typeof callback === 'function') {
        callback({ success: true, lobby: lobbyData });
      }

      socket.emit('lobby:state', lobbyData);
    } catch (err) {
      console.error('[Socket Error] lobby:join:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 4. LOBBY: READY TOGGLE
  socket.on('lobby:ready', async (data, callback) => {
    try {
      const { matchId, ready } = data || {};
      if (!matchId) return;

      const result = await matchService.setPlayerReady(matchId, userIdStr, ready !== false);
      if (result.error) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        return;
      }

      if (typeof callback === 'function') callback({ success: true });

      io.to(matchId).emit('lobby:player-ready', {
        matchId,
        userId: userIdStr,
        ready: ready !== false,
      });

      if (result.allReady) {
        console.log(`[Lobby] Both players ready in match ${matchId}. Starting match...`);
        io.to(matchId).emit('lobby:starting', { matchId, countdown: 3 });
        setTimeout(() => {
          matchService.startMatch(matchId);
        }, 1500);
      }
    } catch (err) {
      console.error('[Socket Error] lobby:ready:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 5. LOBBY: LEAVE
  socket.on('lobby:leave', async (data) => {
    const { matchId } = data || {};
    if (!matchId) return;

    const match = matchService.getMatch(matchId);
    if (match && match.status === GAME_CONFIG.MATCH_STATUS.WAITING_FOR_READY) {
      match.status = GAME_CONFIG.MATCH_STATUS.CANCELLED;
      io.to(matchId).emit('lobby:player-left', {
        userId: userIdStr,
        username: user.username,
        message: `${user.username} has left the lobby. Match cancelled.`,
      });
      matchService.activeMatches.delete(matchId);
    }
    socket.leave(matchId);
  });

  // 6. GAMEPLAY: ANSWER SUBMISSION
  socket.on('answer:submit', async (data, callback) => {
    try {
      const { matchId, guess } = data || {};
      if (!matchId || !guess) {
        if (typeof callback === 'function') callback({ success: false, error: 'Match ID and guess required' });
        return;
      }

      const result = await matchService.submitAnswer(matchId, userIdStr, guess.trim());

      if (typeof callback === 'function') {
        callback(result);
      }

      socket.emit('answer:result', result);
    } catch (err) {
      console.error('[Socket Error] answer:submit:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 7. SESSION: RESUME / RECONNECT
  socket.on('session:resume', (data, callback) => {
    try {
      const { matchId } = data || {};
      if (!matchId) {
        if (typeof callback === 'function') callback({ success: false, error: 'Match ID required' });
        return;
      }

      const restoredState = matchService.handleReconnection(matchId, userIdStr, socket.id);
      if (!restoredState) {
        if (typeof callback === 'function') callback({ success: false, error: 'Active match not found or ended' });
        return;
      }

      socket.join(matchId);

      if (typeof callback === 'function') {
        callback({ success: true, match: restoredState });
      }

      socket.emit('match:resume', restoredState);
    } catch (err) {
      console.error('[Socket Error] session:resume:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 8. DISCONNECT
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] User ${user.username} (${userIdStr}) disconnected. Reason: ${reason}`);

    // Remove from queue if waiting
    matchmakingService.removeFromQueue(userIdStr);

    // Handle lobby/game disconnection
    matchService.handleDisconnection(userIdStr, socket.id);
  });
};
