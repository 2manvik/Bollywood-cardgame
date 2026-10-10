import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { cardApi, challengeApi, userApi, matchApi } from '../services/api';
import CategoryCard from '../components/CategoryCard';
import MatchmakingLoader from '../components/MatchmakingLoader';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  // Categories
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('random_mix');
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Matchmaking
  const [searching, setSearching] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [opponentName, setOpponentName] = useState('');

  // Friend Challenge / Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState({ incoming: [], outgoing: [] });
  const [challengeMsg, setChallengeMsg] = useState('');

  // Recent matches
  const [recentMatches, setRecentMatches] = useState([]);
  const [error, setError] = useState('');

  // Load categories and initial pending challenges
  useEffect(() => {
    async function loadInitialData() {
      try {
        const catRes = await cardApi.getCategories();
        if (catRes.success) setCategories(catRes.categories);

        const chRes = await challengeApi.getPending();
        if (chRes.success) setPendingChallenges({ incoming: chRes.incoming, outgoing: chRes.outgoing });

        const histRes = await matchApi.getHistory();
        if (histRes.success) setRecentMatches(histRes.matches.slice(0, 5));
      } catch (err) {
        console.warn('Dashboard fetch warning:', err);
      } finally {
        setLoadingCategories(false);
      }
    }

    loadInitialData();
  }, []);

  // Listen to matchmaking and challenge events via socket
  useEffect(() => {
    if (!socket) return;

    const onMatchFound = (data) => {
      console.log('[Dashboard] Match found!', data);
      setMatchFound(true);
      setOpponentName(data.opponent?.username || 'Opponent');

      setTimeout(() => {
        setSearching(false);
        setMatchFound(false);
        navigate(`/lobby/${data.matchId}`);
      }, 1500);
    };

    const onMatchError = (data) => {
      setError(data.message || 'Matchmaking error.');
      setSearching(false);
    };

    const onChallengeAccepted = (data) => {
      navigate(`/lobby/${data.matchId}`);
    };

    const onChallengeCancelled = () => {
      refreshPendingChallenges();
    };

    socket.on('matchmaking:found', onMatchFound);
    socket.on('matchmaking:error', onMatchError);
    socket.on('challenge:accepted', onChallengeAccepted);
    socket.on('challenge:cancelled', onChallengeCancelled);

    return () => {
      socket.off('matchmaking:found', onMatchFound);
      socket.off('matchmaking:error', onMatchError);
      socket.off('challenge:accepted', onChallengeAccepted);
      socket.off('challenge:cancelled', onChallengeCancelled);
    };
  }, [socket, navigate]);

  const refreshPendingChallenges = async () => {
    try {
      const chRes = await challengeApi.getPending();
      if (chRes.success) {
        setPendingChallenges({ incoming: chRes.incoming, outgoing: chRes.outgoing });
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Handle Find Random Match
  const handleFindMatch = () => {
    if (!socket || !connected) {
      setError('Cannot join matchmaking: Real-time server disconnected. Please refresh.');
      return;
    }

    setError('');
    setSearching(true);
    setMatchFound(false);

    socket.emit('matchmaking:join', { category: selectedCategory }, (res) => {
      if (res && !res.success) {
        setError(res.error || 'Failed to enter queue.');
        setSearching(false);
      }
    });
  };

  const handleCancelMatchmaking = () => {
    if (socket) {
      socket.emit('matchmaking:cancel', {}, () => {
        setSearching(false);
      });
    } else {
      setSearching(false);
    }
  };

  // Handle Player Search
  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchingUsers(true);
    setError('');
    try {
      const data = await userApi.search(searchQuery.trim());
      setSearchResults(data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to search users.');
    } finally {
      setSearchingUsers(false);
    }
  };

  // Handle Send Challenge
  const handleSendChallenge = async (targetUserId) => {
    setError('');
    setChallengeMsg('');
    try {
      const res = await challengeApi.send(targetUserId, selectedCategory);
      if (res.success) {
        setChallengeMsg('Challenge sent successfully! Waiting for player to accept.');
        refreshPendingChallenges();
      }
    } catch (err) {
      setError(err.message || 'Failed to send challenge.');
    }
  };

  // Handle Accept / Reject Challenge
  const handleAcceptChallenge = async (id) => {
    try {
      const res = await challengeApi.accept(id);
      if (res.success && res.matchId) {
        navigate(`/lobby/${res.matchId}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to accept challenge.');
      refreshPendingChallenges();
    }
  };

  const handleRejectChallenge = async (id) => {
    try {
      await challengeApi.reject(id);
      refreshPendingChallenges();
    } catch (err) {
      console.warn(err);
    }
  };

  const handleCancelOutgoing = async (id) => {
    try {
      await challengeApi.cancel(id);
      refreshPendingChallenges();
    } catch (err) {
      console.warn(err);
    }
  };

  const currentCategoryObj = categories.find(c => c.id === selectedCategory);
  const selectedCategoryName = currentCategoryObj ? currentCategoryObj.name : 'Random Mix';

  return (
    <div className="dashboard-container">
      {/* Matchmaking Overlay */}
      {searching && (
        <MatchmakingLoader
          categoryName={selectedCategoryName}
          onCancel={handleCancelMatchmaking}
          matchFound={matchFound}
          opponentName={opponentName}
        />
      )}

      {/* Top Welcome Bar & Stats */}
      <section className="welcome-banner card">
        <div className="welcome-left">
          <span className="welcome-wave">👋</span>
          <div>
            <h1 className="welcome-heading">Welcome back, <span className="title-gradient">{user?.username}</span>!</h1>
            <p className="welcome-sub">Select your favorite mode, find an opponent, and claim the cards!</p>
          </div>
        </div>

        <div className="quick-stats-strip">
          <div className="stat-box">
            <span className="stat-val">{user?.statistics?.matchesPlayed || 0}</span>
            <span className="stat-sub">Matches</span>
          </div>
          <div className="stat-box">
            <span className="stat-val highlight-win">{user?.statistics?.wins || 0}</span>
            <span className="stat-sub">Wins</span>
          </div>
          <div className="stat-box">
            <span className="stat-val highlight-cyan">{user?.statistics?.winRate || 0}%</span>
            <span className="stat-sub">Win Rate</span>
          </div>
          <div className="stat-box">
            <span className="stat-val highlight-purple">{user?.statistics?.totalCardsWon || 0}</span>
            <span className="stat-sub">Cards Won</span>
          </div>
        </div>
      </section>

      <ErrorMessage message={error} onDismiss={() => setError('')} />
      {challengeMsg && (
        <div className="success-banner animate-pop">
          <span>✅ {challengeMsg}</span>
          <button onClick={() => setChallengeMsg('')} className="close-banner">&times;</button>
        </div>
      )}

      {/* Pending Challenges Widget (if any) */}
      {(pendingChallenges.incoming.length > 0 || pendingChallenges.outgoing.length > 0) && (
        <section className="challenges-panel card animate-pop">
          <h2 className="panel-title">⚔️ Live Challenges</h2>
          <div className="challenges-split">
            {pendingChallenges.incoming.length > 0 && (
              <div className="challenge-col">
                <h4 className="col-title">Incoming Challenges ({pendingChallenges.incoming.length})</h4>
                <div className="challenge-list">
                  {pendingChallenges.incoming.map((req) => (
                    <div key={req._id} className="challenge-item">
                      <div className="item-info">
                        <strong>{req.sender?.username}</strong>
                        <span className="badge badge-purple">{req.selectedCategory.replace('_', ' ')}</span>
                      </div>
                      <div className="item-btns">
                        <button onClick={() => handleAcceptChallenge(req._id)} className="btn btn-primary btn-sm">Accept</button>
                        <button onClick={() => handleRejectChallenge(req._id)} className="btn btn-secondary btn-sm">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingChallenges.outgoing.length > 0 && (
              <div className="challenge-col">
                <h4 className="col-title">Sent Challenges ({pendingChallenges.outgoing.length})</h4>
                <div className="challenge-list">
                  {pendingChallenges.outgoing.map((req) => (
                    <div key={req._id} className="challenge-item">
                      <div className="item-info">
                        <span>Waiting for <strong>{req.recipient?.username}</strong></span>
                        <span className="badge badge-cyan">{req.selectedCategory.replace('_', ' ')}</span>
                      </div>
                      <button onClick={() => handleCancelOutgoing(req._id)} className="btn btn-danger btn-sm">Cancel</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Mode & Category Selection */}
      <section className="mode-selection-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-heading">SELECT CATEGORY</h2>
            <p className="section-subheading">Choose what you want to guess before starting the match</p>
          </div>
        </div>

        {loadingCategories ? (
          <LoadingSpinner message="Loading question bank categories..." />
        ) : (
          <div className="categories-grid-selection">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                selected={selectedCategory === cat.id}
                onSelect={setSelectedCategory}
              />
            ))}
          </div>
        )}

        {/* Action Buttons for Matchmaking */}
        <div className="matchmaking-actions-card card">
          <div className="actions-info">
            <span className="action-active-category">
              Current Selection: <strong>{selectedCategoryName}</strong>
            </span>
            <span className="action-hint">Ready to compete in a real-time 1v1 battle?</span>
          </div>
          <button
            onClick={handleFindMatch}
            className="btn btn-primary btn-lg play-now-button"
            disabled={searching}
          >
            <span>⚡ FIND RANDOM OPPONENT</span>
            <span className="btn-arrow">➔</span>
          </button>
        </div>
      </section>

      {/* Challenge a Friend Section */}
      <section className="friend-challenge-section card">
        <div className="challenge-section-header">
          <div>
            <h2 className="section-heading">CHALLENGE A FRIEND</h2>
            <p className="section-subheading">Search for registered players and challenge them directly</p>
          </div>
        </div>

        <form onSubmit={handleSearchUsers} className="user-search-form">
          <input
            type="text"
            className="form-input search-player-input"
            placeholder="Search player by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary search-btn" disabled={searchingUsers}>
            {searchingUsers ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="search-results-list">
            {searchResults.map((p) => (
              <div key={p.id} className="player-search-card">
                <div className="player-search-meta">
                  <span className="player-search-avatar">👤</span>
                  <div>
                    <h4 className="player-search-name">{p.username}</h4>
                    <span className="player-search-stats">
                      Wins: {p.statistics?.wins || 0} | Win Rate: {p.statistics?.winRate || 0}% | Cards: {p.statistics?.totalCardsWon || 0}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleSendChallenge(p.id)}
                  className="btn btn-primary btn-sm"
                >
                  ⚔️ Challenge ({selectedCategoryName.split(' ')[0]})
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <section className="recent-matches-panel card">
          <div className="panel-header-row">
            <h2 className="section-heading">RECENT MATCHES</h2>
            <button onClick={() => navigate('/history')} className="btn btn-secondary btn-sm">
              View All History ➔
            </button>
          </div>
          <div className="recent-match-list">
            {recentMatches.map((m) => (
              <div key={m.matchId} className="recent-match-row">
                <div className="match-category-tag">
                  <span className="badge badge-purple">{m.category.replace('_', ' ')}</span>
                  <span className="match-opponent-text">vs <strong>{m.opponentUsername}</strong></span>
                </div>
                <div className="match-score-summary">
                  <span className="score-badge">{m.userScore} - {m.opponentScore}</span>
                  <span className={`outcome-pill outcome-${m.outcome.toLowerCase()}`}>
                    {m.outcome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
