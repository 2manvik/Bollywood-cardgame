const jwt = require('jsonwebtoken');
const User = require('../models/User');

const parseCookies = (cookieHeader) => {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
};

const socketAuth = async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;

    // Fallback: check handshake cookies
    if (!token && socket.handshake.headers?.cookie) {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      token = cookies.token;
    }

    if (!token) {
      return next(new Error('Authentication failed: No token provided'));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'guess_it_super_secret_jwt_key_bollywood_2026!'
    );

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return next(new Error('Authentication failed: User no longer exists'));
    }

    socket.user = user;
    next();
  } catch (err) {
    console.error(`[Socket Auth Error] ${err.message}`);
    return next(new Error('Authentication failed: Invalid token'));
  }
};

module.exports = socketAuth;
