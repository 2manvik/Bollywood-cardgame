import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultCard.css';

export default function ResultCard({ results, currentUserId, onPlayAgain }) {
  const navigate = useNavigate();

  if (!results) return null;

  const isWinner = results.winnerId === currentUserId;
  const isDraw = results.isDraw || !results.winnerId;

  return (
    <div className="result-card animate-pop">
      <div className="result-trophy">
        {isDraw ? '🤝' : isWinner ? '🏆' : '👏'}
      </div>

      <h1 className="result-headline">
        {isDraw ? "IT'S A DRAW!" : isWinner ? 'VICTORY IS YOURS!' : `${results.winnerUsername} WON!`}
      </h1>

      <p className="result-subtext">
        {isDraw
          ? 'Both players matched wits card for card!'
          : isWinner
          ? 'Incredible Bollywood knowledge! You collected the most cards!'
          : 'Great match! Better luck next round!'}
      </p>

      <div className="final-scoreboard">
        {results.players?.map((p) => {
          const isSelf = p.userId === currentUserId;
          const isPlayerWinner = p.userId === results.winnerId;

          return (
            <div
              key={p.userId}
              className={`final-player-box ${isPlayerWinner ? 'winner-box' : ''} ${isSelf ? 'self-box' : ''}`}
            >
              <div className="final-player-badge">
                {isPlayerWinner && <span className="winner-crown">👑 WINNER</span>}
                {isSelf && <span className="badge badge-purple">YOU</span>}
              </div>
              <h3 className="final-player-name">{p.username}</h3>
              <div className="final-score-digit">{p.score}</div>
              <span className="final-score-text">Cards Won</span>
            </div>
          );
        })}
      </div>

      <div className="match-stats-row">
        <div className="stat-pill">
          <span className="stat-label">Rounds:</span>
          <strong>{results.totalRoundsPlayed || 0}</strong>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Category:</span>
          <strong>{results.category?.replace('_', ' ')?.toUpperCase()}</strong>
        </div>
        {results.duration !== undefined && (
          <div className="stat-pill">
            <span className="stat-label">Duration:</span>
            <strong>{results.duration}s</strong>
          </div>
        )}
      </div>

      <div className="result-actions">
        {onPlayAgain && (
          <button onClick={onPlayAgain} className="btn btn-primary btn-lg">
            🎮 Play Again
          </button>
        )}
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-lg">
          🏠 Return to Dashboard
        </button>
      </div>
    </div>
  );
}
