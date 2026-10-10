# 🎬 GUESS IT! — Real-Time Bollywood Guessing Game

**GUESS IT!** is a full-stack, real-time, two-player multiplayer web game where players compete head-to-head to identify iconic **Bollywood Movies** and **Bollywood Songs** using creative emoji combinations and pictorial clues.

The server authoritatively validates player submissions in real time. The first player to submit a correct answer wins that round's card (+1 card). After all rounds conclude (default: 20 rounds), the player with the most collected cards wins the match!

---

## 🌟 Key Features

- **Real-Time 1v1 Multiplayer**: Server-authoritative gameplay powered by Socket.IO with sub-second synchronization.
- **Three Game Modes**:
  - `Bollywood Movies`: Clues for legendary classics and modern blockbusters.
  - `Bollywood Songs`: Pictorial clues for memorable melodies and dance chartbusters.
  - `Random Mix`: An alternating mix of movie and song cards.
- **Smart Answer Validation**: Case-insensitive, punctuation-tolerant, and abbreviation-friendly normalizer (e.g. accepts "DDLJ", "3 Idiots", "K3G", etc.) without leaking answer keys to clients.
- **Random Matchmaking**: Category-compatible matchmaking queue with instant match generation and cancel controls.
- **Friend Challenges**: In-app player search with live Socket.IO challenge notifications (Accept / Decline / Cancel) and persistent MongoDB storage.
- **Pre-Game Lobby**: Two-player synchronized ready check and match countdown.
- **Synchronized Visual Timer**: 20-second server countdown per round with automatic timeout resolution.
- **Persistent Stats & Match History**: Tracks matches played, wins, losses, draws, win rate, and total cards collected (updated exactly once per match).
- **Graceful Disconnection Handling**: 30-second reconnection grace period with automatic state restoration or forfeiture upon abandonment.
- **Party Game UI/UX**: Dark navy aesthetic with vibrant purple/cyan accents, responsive CSS Grid/Flexbox, and plain CSS (no Tailwind/Bootstrap).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router v7, Socket.IO Client, Fetch API, Plain CSS |
| **Backend** | Node.js (v24), Express.js, Socket.IO, JWT, bcryptjs, cookie-parser, cors, dotenv |
| **Database** | MongoDB (Local / Atlas), Mongoose ORM, MongoDB Compass (GUI inspection) |
| **Testing** | Node.js Native Test Runner (`node --test`), Socket.IO integration tests |

---

## 📁 Project Architecture & Folder Structure

```
rtcapp/
├── client/                      # React + Vite Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Scoreboard, GameCard, etc.)
│   │   ├── context/            # AuthContext & SocketContext
│   │   ├── pages/              # Landing, Login, Register, Dashboard, Lobby, Gameplay, History, Profile
│   │   ├── services/           # REST API client (apiFetch)
│   │   ├── socket/             # Socket.IO connection manager
│   │   ├── styles/             # Global tokens and styling
│   │   ├── App.jsx             # React router configuration
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Design tokens, variables & utilities
│   ├── index.html
│   ├── vite.config.js          # Vite config with /api and /socket.io proxy
│   └── package.json
│
├── server/                      # Node.js + Express + Socket.IO Backend
│   ├── config/
│   │   ├── db.js               # Mongoose MongoDB connection
│   │   └── gameConfig.js       # Centralized game parameters & categories
│   ├── controllers/            # Route controllers (Auth, Users, Cards, Challenges, Matches)
│   ├── middleware/             # JWT auth middleware & global error handling
│   ├── models/                 # Mongoose models (User, GameCard, Match, MatchRequest)
│   ├── routes/                 # Express API routes
│   ├── seeds/
│   │   └── cards.json          # 100 curated Bollywood cards (50 movies + 50 songs)
│   ├── services/
│   │   ├── matchService.js     # Server-authoritative gameplay engine & timer logic
│   │   └── matchmakingService.js # Category-compatible matchmaking queue
│   ├── sockets/
│   │   ├── socketAuth.js       # Handshake JWT authentication middleware
│   │   ├── socketManager.js    # Socket.IO server initialization
│   │   └── gameSocketHandler.js# Real-time event handlers
│   ├── tests/
│   │   ├── server.test.js      # Unit and service tests
│   │   └── e2e.test.js         # Full multiplayer 2-player simulation test
│   ├── utils/
│   │   └── answerValidator.js  # Normalization & answer matching logic
│   ├── app.js                  # Express app setup
│   ├── server.js               # Main HTTP + Socket.IO server entry point
│   ├── seed.js                 # Idempotent database seed script
│   ├── .env.example
│   └── package.json
│
├── package.json                 # Root convenience scripts
├── .gitignore
└── README.md
```

---

## 📋 Prerequisites

Before running the application locally, ensure you have:

1. **Node.js** (v18 or higher; v20+ recommended). Check with:
   ```powershell
   node -v
   npm -v
   ```
2. **MongoDB**: A running MongoDB instance (locally on `127.0.0.1:27017` or MongoDB Atlas URI).
3. **MongoDB Compass** (Optional): Graphical client for inspecting collections.

---

## ⚙️ Environment Variables

A template is provided in `server/.env.example`.

Create or inspect `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/guess_it
JWT_SECRET=guess_it_super_secret_jwt_key_bollywood_2026!
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

*(To use MongoDB Atlas in production, simply replace `MONGODB_URI` with your Atlas connection string).*

---

## 🗄️ MongoDB Setup & Database Seeding

### 1. Verify MongoDB is Running
On Windows PowerShell:
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
```
`TcpTestSucceeded : True` confirms MongoDB is running.

### 2. Inspect with MongoDB Compass
1. Open **MongoDB Compass**.
2. Connect to `mongodb://127.0.0.1:27017`.
3. Locate the `guess_it` database (or observe it created upon seeding).

### 3. Seed Question Bank (100 Cards)
Populate the database with 100 curated Bollywood movie and song cards:
```powershell
npm run seed
```
*(Or inside `server/`: `npm run seed`)*

**Output:**
```
[Seed] Loaded 100 cards from JSON. Validating schema...
[MongoDB] Connected successfully: 127.0.0.1/guess_it
================ SEED REPORT ================
Total Cards in Seed: 100
New Cards Inserted:  100
Cards Updated:       0
Cards Unchanged:     0
=============================================
[Seed] Total active cards in database: 100
```
> **Idempotency Note**: Running `npm run seed` multiple times safely updates changed cards and leaves unchanged cards intact without duplicating entries.

---

## 🚀 Running the Application

For local development, the backend and frontend run in separate terminals:

### Terminal 1: Start Backend Server
```powershell
cd server
npm run dev
```
*(Runs with nodemon on `http://localhost:5000`)*

### Terminal 2: Start Frontend Application
```powershell
cd client
npm run dev
```
*(Runs Vite on `http://localhost:5173`)*

Open your browser and navigate to **`http://localhost:5173`**.

---

## 👥 Testing a 2-Player Match Locally

To test the real-time two-player gameplay on your computer:

1. Open your regular browser window (e.g. Chrome) and visit `http://localhost:5173`.
   - Click **Sign Up** and register **Player 1** (e.g. Username: `RahulDev`, Email: `rahul@test.com`, Password: `password123`).
2. Open an **Incognito / Private Window** (or a second browser like Edge) and visit `http://localhost:5173`.
   - Click **Sign Up** and register **Player 2** (e.g. Username: `SimranK`, Email: `simran@test.com`, Password: `password123`).

### Flow A: Random Matchmaking
1. Both players select the same category on their Dashboard (e.g. **Bollywood Movies** or **Random Mix**).
2. Player 1 clicks **⚡ FIND RANDOM OPPONENT**. The radar searching screen appears.
3. Player 2 clicks **⚡ FIND RANDOM OPPONENT**.
4. The server pairs them instantly! Both screens display **MATCH FOUND!** and automatically transition into the **Match Lobby**.
5. In the Lobby, both players click **⚡ CLICK TO READY UP**.
6. When both are ready, the match begins with a 3-second countdown!
7. Round 1 displays a clue (e.g. `🚂 ❤️ 👰`).
8. The first player to type `DDLJ` or `Dilwale Dulhania Le Jayenge` and press Enter wins the card (+1 card).
9. Play continues across rounds until completion, leading to the **Match Results** victory podium.

### Flow B: Friend Challenge
1. In Player 1's Dashboard, scroll to **CHALLENGE A FRIEND**.
2. Type `SimranK` in the search bar and click **Search**.
3. Click **⚔️ Challenge** next to SimranK's name.
4. Player 2 receives an instant popup alert: *"RahulDev has challenged you to a 2-player match!"*.
5. Player 2 clicks **Accept Challenge**. Both players are redirected to the Match Lobby.

---

## 🧪 Automated Testing

GUESS IT! includes automated test suites covering authentication, model validation, matchmaking queues, answer normalization, scoring, and real-time multiplayer sockets.

Run the test suite:
```powershell
cd server
npm test
```

Tests executed:
- `Answer Validation`: normalization, abbreviations, unicode titles, punctuation stripping.
- `User Persistence`: password hashing with bcrypt, unique indexes, safe stats calculations.
- `Matchmaking Queue`: category compatibility, queue deduplication, cancel removal.
- `Match Service Engine`: atomic round locking, scoring, exactly-once player statistics updating.
- `End-to-End Simulation`: two live Socket.IO client connections, queueing, lobby ready, round start, wrong guess feedback, correct guess resolution, and score synchronization.

---

## 💡 Adding New Cards to the Question Bank

You can add cards at any time without modifying any gameplay code:

1. Open `server/seeds/cards.json`.
2. Add a new card entry:
   ```json
   {
     "category": "bollywood_movies",
     "clue": "🏏 🌧️ 🌾 🇬🇧",
     "answer": "Lagaan",
     "acceptedAnswers": ["Lagaan"],
     "difficulty": "easy",
     "hint": "Villagers play cricket against British tax",
     "isActive": true
   }
   ```
3. Run `npm run seed`. The seed script automatically upserts the new card.

---

## 🔒 Security & Reliability Measures

- **Zero Client Trust**: Answers, timers, card selection, and score assignments are authoritative on the server. Public card payloads sent during an active round strictly omit the answer key.
- **Atomic Concurrency Lock**: Prevents race conditions where two players submit answers in the same millisecond; only the first validated submission claims the card.
- **Safe Statistics**: Player statistics are guarded with conditional atomic operations (`statsUpdated: false`), preventing score inflation upon page refreshes or reconnections.
- **Reconnection Resilience**: Disconnected players are granted a 30-second grace window to reconnect and resume the live round.
#   B o l l y w o o d - c a r d g a m e  
 