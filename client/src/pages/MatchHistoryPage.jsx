import React, { useState, useEffect } from 'react';
import { matchApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './MatchHistoryPage.css';

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await matchApi.getHistory();
        if (res.success) {
          setMatches(res.matches || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load match history.');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const handleViewDetails = async (matchId) => {
    setLoadingDetails(true);
    try {
      const res = await matchApi.getDetails(matchId);
      if (res.success) {
        setSelectedMatch(res.match);
      }
    } catch (err) {
      alert(err.message || 'Could not load details');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading match records..." />;
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h1 className="history-title">MATCH HISTORY</h1>
        <p className="history-subtitle">Review your past Bollywood multiplayer matches and scores</p>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError('')} />

      {matches.length === 0 ? (
        <div className="empty-history card text-center">
          <span className="empty-icon">🎬</span>
          <h3>No Matches Played Yet</h3>
          <p className="text-muted">Jump into random matchmaking or challenge a friend to start your Bollywood legacy!</p>
        </div>
      ) : (
        <div className="history-table-card card">
          <div className="history-list">
            {matches.map((m) => {
              const dateStr = new Date(m.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={m.matchId} className="history-item">
                  <div className="history-item-left">
                    <span className={`result-tag result-${m.outcome.toLowerCase()}`}>
                      {m.outcome}
                    </span>
                    <div className="history-item-info">
                      <div className="history-opponent">
                        vs <strong>{m.opponentUsername}</strong>
                      </div>
                      <div className="history-sub-meta">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span className="badge badge-purple">{m.category.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="history-item-right">
                    <div className="history-score-display">
                      <span className="user-score">{m.userScore}</span>
                      <span className="score-divider">-</span>
                      <span className="opp-score">{m.opponentScore}</span>
                    </div>
                    <button
                      onClick={() => handleViewDetails(m.matchId)}
                      className="btn btn-secondary btn-sm details-btn"
                      disabled={loadingDetails}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="modal-backdrop" onClick={() => setSelectedMatch(null)}>
          <div className="modal-box card animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Match Details</h2>
              <button onClick={() => setSelectedMatch(null)} className="modal-close">&times;</button>
            </div>
            <div className="modal-summary">
              <p><strong>Category:</strong> {selectedMatch.category?.replace('_', ' ')}</p>
              <p><strong>Status:</strong> {selectedMatch.status}</p>
              <p><strong>Duration:</strong> {selectedMatch.duration || 0} seconds</p>
              <p><strong>Winner:</strong> {selectedMatch.winnerUsername || 'DRAW'}</p>
            </div>

            <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Round Breakdown ({selectedMatch.roundHistory?.length || 0})</h4>
            <div className="rounds-scroll-list">
              {selectedMatch.roundHistory?.map((r, i) => (
                <div key={i} className="round-breakdown-row">
                  <span className="r-num">R{r.roundNumber}</span>
                  <span className="r-clue">{r.clue}</span>
                  <span className="r-answer">{r.answer}</span>
                  <span className="r-winner">
                    {r.winnerUsername ? `Won by ${r.winnerUsername}` : 'Timeout (No Winner)'}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={() => setSelectedMatch(null)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
