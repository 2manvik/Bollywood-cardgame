import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, updateUsername } = useAuth();
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stats = user?.statistics || {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalCardsWon: 0,
    winRate: 0,
  };

  const handleSaveUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    if (newUsername.trim() === user?.username) {
      setEditing(false);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const res = await updateUsername(newUsername.trim());
    setSubmitting(false);

    if (res.success) {
      setSuccess('Username updated successfully!');
      setEditing(false);
    } else {
      setError(res.error || 'Failed to update username.');
    }
  };

  const createdDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="profile-container">
      <div className="profile-card card animate-pop">
        <div className="profile-top">
          <div className="profile-avatar">👤</div>
          <div className="profile-primary-info">
            {editing ? (
              <form onSubmit={handleSaveUsername} className="edit-username-form">
                <input
                  type="text"
                  className="form-input edit-username-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  minLength={3}
                  maxLength={20}
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setNewUsername(user?.username || ''); }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="username-display-row">
                <h1 className="profile-username">{user?.username}</h1>
                <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm edit-btn">
                  ✏️ Edit
                </button>
              </div>
            )}
            <p className="profile-email">{user?.email}</p>
            <span className="profile-join-date">Member since {createdDate}</span>
          </div>
        </div>

        <ErrorMessage message={error} onDismiss={() => setError('')} />
        {success && <div className="success-banner animate-pop">✅ {success}</div>}

        <div className="profile-divider" />

        <h3 className="stats-heading">COMPETITIVE RECORD</h3>
        <div className="profile-stats-grid">
          <div className="stat-card">
            <span className="stat-title">Matches Played</span>
            <span className="stat-value">{stats.matchesPlayed}</span>
          </div>
          <div className="stat-card win-stat">
            <span className="stat-title">Victories (Wins)</span>
            <span className="stat-value">{stats.wins}</span>
          </div>
          <div className="stat-card loss-stat">
            <span className="stat-title">Losses</span>
            <span className="stat-value">{stats.losses}</span>
          </div>
          <div className="stat-card draw-stat">
            <span className="stat-title">Draws</span>
            <span className="stat-value">{stats.draws}</span>
          </div>
          <div className="stat-card rate-stat">
            <span className="stat-title">Win Rate</span>
            <span className="stat-value">{stats.winRate}%</span>
          </div>
          <div className="stat-card cards-stat">
            <span className="stat-title">Total Cards Collected</span>
            <span className="stat-value">{stats.totalCardsWon}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
