const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { io: ioClient } = require('../../client/node_modules/socket.io-client');

const app = require('../app');
const setupSocketIO = require('../sockets/socketManager');
const connectDB = require('../config/db');
const User = require('../models/User');
const GameCard = require('../models/GameCard');
const Match = require('../models/Match');
const MatchRequest = require('../models/MatchRequest');

describe('End-to-End Real-Time Multiplayer Flow', () => {
  let server;
  let serverPort = 5099;
  let socketServer;
  let tokenA, tokenB;
  let userA, userB;
  let socketA, socketB;

  before(async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/guess_it_test';
    process.env.JWT_SECRET = 'e2e_secret_jwt_key_test';
    process.env.CLIENT_URL = 'http://localhost:5173';

    await connectDB();
    await User.deleteMany({});
    await GameCard.deleteMany({});
    await Match.deleteMany({});
    await MatchRequest.deleteMany({});

    // Seed test cards for movies
    await GameCard.create([
      {
        category: 'bollywood_movies',
        clue: '🚂 ❤️ 👰',
        answer: 'Dilwale Dulhania Le Jayenge',
        normalizedAnswer: 'dilwale dulhania le jayenge',
        acceptedAnswers: ['DDLJ'],
        difficulty: 'easy',
        hint: 'Raj and Simran',
        isActive: true,
      },
      {
        category: 'bollywood_movies',
        clue: '🧑‍🎓 🏫 👬',
        answer: '3 Idiots',
        normalizedAnswer: '3 idiots',
        acceptedAnswers: ['Three Idiots'],
        difficulty: 'easy',
        hint: 'All is well',
        isActive: true,
      },
    ]);

    server = http.createServer(app);
    socketServer = setupSocketIO(server);

    await new Promise((resolve) => {
      server.listen(serverPort, '127.0.0.1', () => {
        console.log(`[E2E] Test HTTP server listening on http://127.0.0.1:${serverPort}`);
        resolve();
      });
    });
  });

  after(async () => {
    const matchService = require('../services/matchService');
    matchService.activeMatches.clear();
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (socketServer) socketServer.close();
    if (server) {
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      server.close();
    }
    await mongoose.connection.close();
  });

  test('registers two players and retrieves auth tokens', async () => {
    const regResA = await fetch(`http://127.0.0.1:${serverPort}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'PlayerArjun',
        email: 'arjun@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }),
    });
    const dataA = await regResA.json();
    assert.strictEqual(dataA.success, true);
    assert.ok(dataA.token);
    tokenA = dataA.token;
    userA = dataA.user;

    const regResB = await fetch(`http://127.0.0.1:${serverPort}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'PlayerRanbir',
        email: 'ranbir@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }),
    });
    const dataB = await regResB.json();
    assert.strictEqual(dataB.success, true);
    assert.ok(dataB.token);
    tokenB = dataB.token;
    userB = dataB.user;
  });

  test('connects both players via Socket.IO with auth tokens', async () => {
    socketA = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token: tokenA },
    });

    socketB = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token: tokenB },
    });

    await Promise.all([
      new Promise((resolve) => socketA.on('connect', resolve)),
      new Promise((resolve) => socketB.on('connect', resolve)),
    ]);

    assert.strictEqual(socketA.connected, true);
    assert.strictEqual(socketB.connected, true);
  });

  test('executes random matchmaking, lobby, and round resolution', async () => {
    let matchId;

    // Listen for matchmaking:found on both sockets
    const matchFoundPromiseA = new Promise((resolve) => {
      socketA.on('matchmaking:found', (data) => {
        resolve(data);
      });
    });

    const matchFoundPromiseB = new Promise((resolve) => {
      socketB.on('matchmaking:found', (data) => {
        resolve(data);
      });
    });

    // Both players join queue with 'bollywood_movies'
    socketA.emit('matchmaking:join', { category: 'bollywood_movies' });
    socketB.emit('matchmaking:join', { category: 'bollywood_movies' });

    const [foundA, foundB] = await Promise.all([matchFoundPromiseA, matchFoundPromiseB]);

    assert.strictEqual(foundA.matchId, foundB.matchId);
    assert.strictEqual(foundA.category, 'bollywood_movies');
    assert.strictEqual(foundA.opponent.username, 'PlayerRanbir');
    assert.strictEqual(foundB.opponent.username, 'PlayerArjun');
    matchId = foundA.matchId;

    // Both players join lobby
    const lobbyJoinA = await new Promise((res) => socketA.emit('lobby:join', { matchId }, res));
    const lobbyJoinB = await new Promise((res) => socketB.emit('lobby:join', { matchId }, res));
    assert.strictEqual(lobbyJoinA.success, true);
    assert.strictEqual(lobbyJoinB.success, true);

    // Prepare game start and round start promises
    const roundStartedPromise = new Promise((resolve) => {
      socketA.on('round:started', resolve);
    });

    // Both players click Ready
    socketA.emit('lobby:ready', { matchId, ready: true });
    socketB.emit('lobby:ready', { matchId, ready: true });

    // Round starts!
    const roundData = await roundStartedPromise;
    assert.strictEqual(roundData.matchId, matchId);
    assert.strictEqual(roundData.roundNumber, 1);
    assert.ok(roundData.card.clue);
    // Answer must NOT be leaked in public card!
    assert.strictEqual(roundData.card.answer, undefined);
    assert.strictEqual(roundData.card.acceptedAnswers, undefined);

    // Player B submits an incorrect guess
    const wrongResultPromise = new Promise((resolve) => {
      socketB.on('answer:result', resolve);
    });
    socketB.emit('answer:submit', { matchId, guess: 'Totally Wrong Movie' });
    const wrongResult = await wrongResultPromise;
    assert.strictEqual(wrongResult.correct, false);

    // Player A submits the correct guess (either 3 Idiots or DDLJ depending on randomly chosen card)
    const cardClue = roundData.card.clue;
    const targetGuess = cardClue.includes('🚂') ? 'DDLJ' : '3 Idiots';

    const roundResolvedPromiseA = new Promise((resolve) => {
      socketA.on('round:resolved', resolve);
    });
    const roundResolvedPromiseB = new Promise((resolve) => {
      socketB.on('round:resolved', resolve);
    });

    socketA.emit('answer:submit', { matchId, guess: targetGuess });

    const [resolvedA, resolvedB] = await Promise.all([roundResolvedPromiseA, roundResolvedPromiseB]);
    assert.strictEqual(resolvedA.correct, true);
    assert.strictEqual(resolvedB.correct, true);
    assert.strictEqual(resolvedA.winnerUsername, 'PlayerArjun');
    assert.strictEqual(resolvedB.winnerUsername, 'PlayerArjun');
    assert.strictEqual(resolvedA.scores[userA.id], 1);
    assert.strictEqual(resolvedA.scores[userB.id], 0);

    // Clue answer is now revealed upon resolution
    assert.ok(resolvedA.answer);

    // Clean up timers and state
    const matchService = require('../services/matchService');
    matchService.clearMatch(matchId);
  });
});
