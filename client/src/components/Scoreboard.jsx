import React from 'react';
import './Scoreboard.css';

export default function Scoreboard({ players, currentUserId, scores }) {
  if (!players || players.length === 0) return null;

  return (
    <div className="scoreboard-container">
      {players.map((player) => {
        const isSelf = player.userId === currentUserId;
        const score = scores?.[player.userId] ?? player.score ?? 0;

        return (
          <div key={player.userId} className={`scoreboard-player ${isSelf ? 'self' : 'opponent'}`}>
            <div className="player-meta">
              <span className="player-avatar">{isSelf ? '😎' : '🎯'}</span>
              <div className="player-details">
                <span className="player-name">
                  {player.username} {isSelf && '(You)'}
                </span>
                <span className={`status-dot ${player.connected === false ? 'offline' : 'online'}`}>
                  {player.connected === false ? 'Disconnected' : 'Online'}
                </span>
              </div>
            </div>
            <div className="player-score-box">
              <span className="player-score-num">{score}</span>
              <span className="player-score-label">CARDS</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
