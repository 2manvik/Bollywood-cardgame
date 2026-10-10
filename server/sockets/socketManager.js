const { Server } = require('socket.io');
const socketAuth = require('./socketAuth');
const registerGameHandlers = require('./gameSocketHandler');
const matchService = require('../services/matchService');

function setupSocketIO(server) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const io = new Server(server, {
    cors: {
      origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  // Attach auth middleware
  io.use(socketAuth);

  // Provide io instance to matchService
  matchService.setIo(io);

  io.on('connection', (socket) => {
    registerGameHandlers(io, socket);
  });

  console.log('[Socket.IO] Real-time game server initialized successfully');
  return io;
}

module.exports = setupSocketIO;
