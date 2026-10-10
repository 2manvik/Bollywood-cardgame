const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/db');
const setupSocketIO = require('./sockets/socketManager');

// Verify critical environment variables
if (!process.env.JWT_SECRET) {
  console.warn('[Warning] JWT_SECRET not found in environment. Using default development secret.');
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP Server
    const server = http.createServer(app);

    // Initialize Socket.IO
    setupSocketIO(server);

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  🎬 GUESS IT! Real-Time Bollywood Server Running! 🎬`);
      console.log(`  PORT:        http://localhost:${PORT}`);
      console.log(`  Health API:  http://localhost:${PORT}/api/health`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error(`[Server Start Error] ${err.message}`);
    process.exit(1);
  }
}

startServer();
