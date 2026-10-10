import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LobbyPlayer from '../components/LobbyPlayer';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './MatchLobbyPage.css';

export default function MatchLobbyPage() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [lobbyData, setLobbyData] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [startingCountdown, setStartingCountdown] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    // Join lobby room
    socket.emit('lobby:join', { matchId }, (res) => {
      setLoading(false);
      if (res && res.success) {
        setLobbyData(res.lobby);
        const myPlayer = res.lobby.players.find(p => p.userId === user._id.toString());
        if (myPlayer) setIsReady(myPlayer.ready);
      } else {
        setError(res?.error || 'Could not connect to match lobby.');
      }
    });

    const onLobbyState = (data) => {
      setLobbyData(data);
    };

    const onPlayerReady = (data) => {
      setLobbyData((prev) => {
        if (!prev) return prev;
        const updatedPlayers = prev.players.map(p =>
          p.userId === data.userId ? { ...p, ready: data.ready } : p
        );
        return { ...prev, players: updatedPlayers };
      });
    };

    const onLobbyStarting = (data) => {
      setStartingCountdown(data.countdown || 3);
    };

    const onGameStarted = () => {
      navigate(`/game/${matchId}`);
    };

    const onPlayerLeft = (data) => {
      setError(data.message || 'Opponent has left the lobby.');
    };

    socket.on('lobby:state', onLobbyState);
    socket.on('lobby:player-ready', onPlayerReady);
    socket.on('lobby:starting', onLobbyStarting);
    socket.on('game:started', onGameStarted);
    socket.on('lobby:player-left', onPlayerLeft);

    return () => {
      socket.off('lobby:state', onLobbyState);
      socket.off('lobby:player-ready', onPlayerReady);
      socket.off('lobby:starting', onLobbyStarting);
      socket.off('game:started', onGameStarted);
      socket.off('lobby:player-left', onPlayerLeft);
    };
  }, [socket, matchId, user, navigate]);

  const handleToggleReady = () => {
    if (!socket) return;
    const nextState = !isReady;
    setIsReady(nextState);

    socket.emit('lobby:ready', { matchId, ready: nextState }, (res) => {
      if (res && !res.success) {
        setIsReady(!nextState);
        setError(res.error || 'Failed to update ready state.');
      }
    });
  };

  const handleLeaveLobby = () => {
    if (socket) {
      socket.emit('lobby:leave', { matchId });
    }
    navigate('/dashboard');
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Entering match lobby..." />;
  }

  const categoryLabel =
    lobbyData?.category === 'bollywood_movies'
      ? 'Bollywood Movies 🎬'
      : lobbyData?.category === 'bollywood_songs'
      ? 'Bollywood Songs 🎵'
      : 'Random Mix 🎲';

  return (
    <div className="lobby-container">
      <div className="lobby-card card animate-pop">
        <div className="lobby-header">
          <span className="lobby-badge">⚔️ 2-PLAYER BATTLE ARENA</span>
          <h1 className="lobby-title">MATCH LOBBY</h1>
          <div className="lobby-config-strip">
            <span className="config-tag">
              Category: <strong>{categoryLabel}</strong>
            </span>
            <span className="config-tag">
              Rounds: <strong>{lobbyData?.configuredRounds || 20}</strong>
            </span>
            <span className="config-tag">
              Timer: <strong>20s / round</strong>
            </span>
          </div>
        </div>

        <ErrorMessage message={error} onDismiss={() => setError('')} />

        {startingCountdown !== null && (
          <div className="lobby-countdown-banner animate-pop">
            <span>🔥 BOTH PLAYERS READY! STARTING IN {startingCountdown}...</span>
          </div>
        )}

        {/* Both Players Cards */}
        <div className="lobby-players-row">
          {lobbyData?.players?.map((p) => (
            <LobbyPlayer
              key={p.userId}
              player={p}
              isSelf={p.userId === user._id.toString()}
            />
          ))}
        </div>

        {/* Lobby Actions */}
        <div className="lobby-actions-footer">
          <button
            onClick={handleToggleReady}
            className={`btn ${isReady ? 'btn-secondary ready-active' : 'btn-primary'} btn-lg ready-toggle-btn`}
            disabled={startingCountdown !== null}
          >
            {isReady ? '✓ YOU ARE READY (WAITING FOR OPPONENT...)' : '⚡ CLICK TO READY UP'}
          </button>

          <button onClick={handleLeaveLobby} className="btn btn-danger leave-btn">
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
