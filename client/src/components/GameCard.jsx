import React from 'react';
import './GameCard.css';

export default function GameCard({ card, roundNumber, totalRounds }) {
  if (!card) return null;

  const isMovie = card.category === 'bollywood_movies';
  const categoryHeader = isMovie ? '🎬 GUESS THE BOLLYWOOD MOVIE!' : '🎵 GUESS THE BOLLYWOOD SONG!';

  return (
    <div className="game-card animate-pop">
      <div className="game-card-header">
        <span className="round-pill">
          ROUND {roundNumber} / {totalRounds}
        </span>
        <span className={`badge ${isMovie ? 'badge-purple' : 'badge-cyan'}`}>
          {isMovie ? 'Movie Clue' : 'Song Clue'}
        </span>
      </div>

      <div className="game-card-target-label">
        {categoryHeader}
      </div>

      <div className="game-card-clue-box">
        <span className="clue-emojis">{card.clue}</span>
      </div>

      {card.hint && (
        <div className="game-card-hint">
          <span className="hint-label">💡 Hint:</span> {card.hint}
        </div>
      )}
    </div>
  );
}
