import React from 'react';
import './LobbyPlayer.css';

export default function LobbyPlayer({ player, isSelf }) {
  if (!player) return null;

  return (
    <div className={`lobby-player-card ${player.ready ? 'ready' : ''} ${isSelf ? 'is-self' : ''}`}>
      <div className="player-avatar-large">
        {player.ready ? '🔥' : '👤'}
      </div>
      <div className="player-info">
        <h3 className="player-username">
          {player.username} {isSelf && <span className="you-tag">(You)</span>}
        </h3>
        <span className={`connection-badge ${player.connected ? 'online' : 'offline'}`}>
          {player.connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      <div className="ready-status-box">
        {player.ready ? (
          <span className="ready-tag ready-yes">✓ READY</span>
        ) : (
          <span className="ready-tag ready-no">WAITING...</span>
        )}
      </div>
    </div>
  );
}
