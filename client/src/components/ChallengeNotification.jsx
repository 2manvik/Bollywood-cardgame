import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { challengeApi } from '../services/api';
import './ChallengeNotification.css';

export default function ChallengeNotification() {
  const { incomingChallenge, clearChallenge } = useSocket();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!incomingChallenge) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      const data = await challengeApi.accept(incomingChallenge.challengeId);
      clearChallenge();
      if (data.matchId) {
        navigate(`/lobby/${data.matchId}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to accept challenge.');
      clearChallenge();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await challengeApi.reject(incomingChallenge.challengeId);
    } catch (err) {
      console.warn(err);
    } finally {
      clearChallenge();
      setLoading(false);
    }
  };

  const categoryName =
    incomingChallenge.category === 'bollywood_movies'
      ? 'Bollywood Movies 🎬'
      : incomingChallenge.category === 'bollywood_songs'
      ? 'Bollywood Songs 🎵'
      : 'Random Mix 🎲';

  return (
    <div className="challenge-banner animate-pop">
      <div className="challenge-header">
        <span className="challenge-badge">⚔️ NEW CHALLENGE</span>
        <button onClick={clearChallenge} className="challenge-close">&times;</button>
      </div>
      <div className="challenge-body">
        <p className="challenge-text">
          <strong>{incomingChallenge.sender?.username}</strong> has challenged you to a 2-player match!
        </p>
        <div className="challenge-meta">
          <span className="badge badge-purple">{categoryName}</span>
        </div>
      </div>
      <div className="challenge-actions">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="btn btn-primary btn-sm"
        >
          {loading ? 'Joining...' : 'Accept Challenge'}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="btn btn-secondary btn-sm"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
