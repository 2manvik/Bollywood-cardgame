/**
 * Normalizes a string for answer comparison:
 * - Converts to lowercase
 * - Replaces punctuation and special characters with spaces
 * - Collapses multiple spaces into a single space
 * - Trims leading and trailing whitespace
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // keep unicode letters, numbers, and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all spaces and punctuation for compact matching (e.g. "k3g", "3idiots")
 */
function compactString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

/**
 * Validates a user guess against a card's correct answer and accepted alternatives.
 * @param {string} userGuess - The player's submitted answer
 * @param {string} correctAnswer - The canonical answer
 * @param {string[]} acceptedAnswers - Optional array of alternative titles/abbreviations
 * @returns {boolean} - True if the answer is accepted as correct
 */
function isAnswerCorrect(userGuess, correctAnswer, acceptedAnswers = []) {
  if (!userGuess || !correctAnswer) return false;

  const normalizedGuess = normalizeString(userGuess);
  const compactGuess = compactString(userGuess);

  if (!normalizedGuess && !compactGuess) return false;

  const allTargets = [correctAnswer, ...(Array.isArray(acceptedAnswers) ? acceptedAnswers : [])];

  for (const target of allTargets) {
    if (!target) continue;
    const normalizedTarget = normalizeString(target);
    const compactTarget = compactString(target);

    // Exact normalized match (e.g. "dilwale dulhania le jayenge")
    if (normalizedGuess === normalizedTarget) {
      return true;
    }

    // Compact match if length >= 3 to avoid false positives on 1-2 char words
    if (compactGuess.length >= 3 && compactGuess === compactTarget) {
      return true;
    }
  }

  return false;
}

module.exports = {
  normalizeString,
  compactString,
  isAnswerCorrect,
};
