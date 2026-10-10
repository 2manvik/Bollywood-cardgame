import React from 'react';
import './MatchmakingLoader.css';

export default function MatchmakingLoader({ categoryName, onCancel, matchFound, opponentName }) {
  return (
    <div className="matchmaking-overlay">
      <div className="matchmaking-box animate-pop">
        {matchFound ? (
          <div className="match-found-state">
            <span className="match-found-icon">🎉</span>
            <h2 className="title-gradient">MATCH FOUND!</h2>
            <div className="match-opponent-card">
              <span className="opponent-label">Your Opponent:</span>
              <strong className="opponent-name">{opponentName}</strong>
            </div>
            <p className="match-starting-text">Entering Match Lobby...</p>
          </div>
        ) : (
          <div className="searching-state">
            <div className="radar-container">
              <div className="radar-circle circle-1" />
              <div className="radar-circle circle-2" />
              <div className="radar-circle circle-3" />
              <span className="radar-center-icon">🔍</span>
            </div>

            <h2 className="searching-title">FINDING YOUR OPPONENT</h2>
            <p className="searching-subtitle">Searching for another player in matchmaking queue...</p>

            <div className="searching-category-badge">
              <span className="badge badge-purple">{categoryName}</span>
            </div>

            <button onClick={onCancel} className="btn btn-secondary cancel-search-btn">
              Cancel Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
