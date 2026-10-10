const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const GameCard = require('./models/GameCard');
const GAME_CONFIG = require('./config/gameConfig');
const { normalizeString } = require('./utils/answerValidator');

async function seedCards() {
  console.log('[Seed] Starting Bollywood card bank seeding...');

  const cardsFilePath = path.join(__dirname, 'seeds', 'cards.json');
  if (!fs.existsSync(cardsFilePath)) {
    console.error(`[Seed Error] Cards file not found at: ${cardsFilePath}`);
    process.exit(1);
  }

  let cardsData;
  try {
    const raw = fs.readFileSync(cardsFilePath, 'utf8');
    cardsData = JSON.parse(raw);
  } catch (err) {
    console.error(`[Seed Error] Failed to parse cards.json: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(cardsData) || cardsData.length === 0) {
    console.error('[Seed Error] cards.json must contain a non-empty array of cards');
    process.exit(1);
  }

  console.log(`[Seed] Loaded ${cardsData.length} cards from JSON. Validating schema...`);

  // Validation
  const validatedOperations = [];
  const seenIdentities = new Set();

  for (let i = 0; i < cardsData.length; i++) {
    const card = cardsData[i];
    const indexStr = `Card index ${i} (${card.answer || 'unknown'})`;

    if (!card.category || !GAME_CONFIG.ALLOWED_CONTENT_CATEGORIES.includes(card.category)) {
      console.error(`[Validation Failed] ${indexStr}: Invalid or missing category "${card.category}". Allowed: ${GAME_CONFIG.ALLOWED_CONTENT_CATEGORIES.join(', ')}`);
      process.exit(1);
    }

    if (!card.clue || typeof card.clue !== 'string' || card.clue.trim().length === 0) {
      console.error(`[Validation Failed] ${indexStr}: Clue must be a non-empty string`);
      process.exit(1);
    }

    if (!card.answer || typeof card.answer !== 'string' || card.answer.trim().length === 0) {
      console.error(`[Validation Failed] ${indexStr}: Answer must be a non-empty string`);
      process.exit(1);
    }

    if (card.difficulty && !GAME_CONFIG.DIFFICULTIES.includes(card.difficulty)) {
      console.error(`[Validation Failed] ${indexStr}: Invalid difficulty "${card.difficulty}". Allowed: ${GAME_CONFIG.DIFFICULTIES.join(', ')}`);
      process.exit(1);
    }

    const normAnswer = normalizeString(card.answer);
    if (!normAnswer) {
      console.error(`[Validation Failed] ${indexStr}: Normalized answer resulted in empty string`);
      process.exit(1);
    }

    const identityKey = `${card.category}:::${normAnswer}`;
    if (seenIdentities.has(identityKey)) {
      console.error(`[Validation Failed] Duplicate card in JSON file: Category "${card.category}", Answer "${card.answer}"`);
      process.exit(1);
    }
    seenIdentities.add(identityKey);

    const acceptedAnswers = Array.isArray(card.acceptedAnswers)
      ? card.acceptedAnswers.filter(a => typeof a === 'string' && a.trim().length > 0)
      : [];

    validatedOperations.push({
      updateOne: {
        filter: { category: card.category, normalizedAnswer: normAnswer },
        update: {
          $set: {
            category: card.category,
            clue: card.clue.trim(),
            answer: card.answer.trim(),
            normalizedAnswer: normAnswer,
            acceptedAnswers: acceptedAnswers,
            difficulty: card.difficulty || 'easy',
            hint: card.hint ? card.hint.trim() : '',
            isActive: card.isActive !== undefined ? Boolean(card.isActive) : true,
          },
        },
        upsert: true,
      },
    });
  }

  // Connect to DB
  await connectDB();

  // Ensure indexes on GameCard
  await GameCard.init();

  console.log(`[Seed] Executing bulk write for ${validatedOperations.length} cards...`);
  const result = await GameCard.bulkWrite(validatedOperations);

  const inserted = result.upsertedCount || 0;
  const modified = result.modifiedCount || 0;
  const matched = result.matchedCount || 0;
  const unchanged = matched - modified;

  console.log(`\n================ SEED REPORT ================`);
  console.log(`Total Cards in Seed: ${validatedOperations.length}`);
  console.log(`New Cards Inserted:  ${inserted}`);
  console.log(`Cards Updated:       ${modified}`);
  console.log(`Cards Unchanged:     ${unchanged}`);
  console.log(`=============================================\n`);

  const totalInDb = await GameCard.countDocuments({ isActive: true });
  console.log(`[Seed] Total active cards in database: ${totalInDb}`);

  await mongoose.connection.close();
  console.log('[Seed] Database connection closed. Seeding complete!');
  process.exit(0);
}

seedCards().catch(err => {
  console.error('[Seed Error] Fatal error during seeding:', err);
  process.exit(1);
});
