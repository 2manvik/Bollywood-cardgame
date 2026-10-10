import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Scoreboard from '../components/Scoreboard';
import CountdownTimer from '../components/CountdownTimer';
import GameCard from '../components/GameCard';
import AnswerInput from '../components/AnswerInput';
import ResultCard from '../components/ResultCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './GameplayPage.css';

export default function GameplayPage() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Match & Round States
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(20);
  const [scores, setScores] = useState({});
  const [currentCard, setCurrentCard] = useState(null);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [timerDuration, setTimerDuration] = useState(20);
  const [roundResolved, setRoundResolved] = useState(false);
  const [resolutionData, setResolutionData] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalSummary, setFinalSummary] = useState(null);

  // Status banners & feedback
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [isWrongGuess, setIsWrongGuess] = useState(false);
  const [disconnectNotice, setDisconnectNotice] = useState(null);
  const [error, setError] = useState('');

  const currentUserId = user?._id?.toString();

  useEffect(() => {
    if (!socket) return;

    // Join match room or resume session
    socket.emit('session:resume', { matchId }, (res) => {
      setLoading(false);
      if (res && res.success) {
        const m = res.match;
        setMatchData(m);
        setCurrentRound(m.currentRound);
        setTotalRounds(m.configuredRounds);
        setScores(m.scores || {});
        if (m.card) {
          setCurrentCard(m.card);
          setTimerStartTime(Date.now() - (m.remainingTime !== undefined ? (20 - m.remainingTime) * 1000 : 0));
          setTimerDuration(m.remainingTime || 20);
        }
        if (m.status === 'ROUND_RESOLVED') {
          setRoundResolved(true);
        } else if (m.status === 'COMPLETED') {
          setGameOver(true);
        }
      } else {
        // If not in memory active state, check if match was completed or fetch from DB
        fetchMatchDetails();
      }
    });

    // Sockets Gameplay Event Listeners
    const onRoundStarted = (data) => {
      console.log('[Game] Round started:', data);
      setLoading(false);
      setCurrentRound(data.roundNumber);
      setTotalRounds(data.totalRounds);
      setCurrentCard(data.card);
      setTimerStartTime(data.startTime);
      setTimerDuration(data.duration);
      setScores(data.scores || {});
      setRoundResolved(false);
      setResolutionData(null);
      setFeedbackMsg(null);
      setIsWrongGuess(false);
    };

    const onAnswerResult = (data) => {
      if (!data.correct) {
        setIsWrongGuess(true);
        setFeedbackMsg(data.message || 'Incorrect guess. Try again!');
        setTimeout(() => setIsWrongGuess(false), 800);
      }
    };

    const onRoundResolved = (data) => {
      console.log('[Game] Round resolved:', data);
      setRoundResolved(true);
      setResolutionData(data);
      setScores(data.scores || {});
      setFeedbackMsg(null);
    };

    const onGameCompleted = (data) => {
      console.log('[Game] Game completed:', data);
      setGameOver(true);
      setFinalSummary(data);
    };

    const onPlayerDisconnected = (data) => {
      setDisconnectNotice(`${data.username} disconnected. Reconnection grace period: ${data.gracePeriodSeconds}s.`);
    };

    const onPlayerReconnected = (data) => {
      setDisconnectNotice(null);
    };

    const onMatchAbandoned = (data) => {
      setDisconnectNotice(`Match abandoned by ${data.abandonedUsername}.`);
    };

    socket.on('round:started', onRoundStarted);
    socket.on('answer:result', onAnswerResult);
    socket.on('round:resolved', onRoundResolved);
    socket.on('game:completed', onGameCompleted);
    socket.on('player:disconnected', onPlayerDisconnected);
    socket.on('player:reconnected', onPlayerReconnected);
    socket.on('match:abandoned', onMatchAbandoned);

    return () => {
      socket.off('round:started', onRoundStarted);
      socket.off('answer:result', onAnswerResult);
      socket.off('round:resolved', onRoundResolved);
      socket.off('game:completed', onGameCompleted);
      socket.off('player:disconnected', onPlayerDisconnected);
      socket.off('player:reconnected', onPlayerReconnected);
      socket.off('match:abandoned', onMatchAbandoned);
    };
  }, [socket, matchId]);

  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('guess_it_token')}`,
        },
        credentials: 'include',
      });
      const data = await res.json();
      setLoading(false);
      if (data.success && data.match) {
        const m = data.match;
        setMatchData({
          matchId: m.matchId,
          players: m.players.map(p => ({
            userId: p.user?._id || p.user,
            username: p.username,
            score: p.score,
            connected: p.connected,
          })),
          configuredRounds: m.configuredRounds,
          currentRound: m.currentRound,
          category: m.category,
        });
        if (m.status === 'COMPLETED') {
          setGameOver(true);
          setFinalSummary({
            matchId: m.matchId,
            players: m.players,
            winnerId: m.winner?._id || m.winner,
            winnerUsername: m.winnerUsername,
            isDraw: m.isDraw,
            totalRoundsPlayed: m.currentRound,
            duration: m.duration,
            category: m.category,
          });
        }
      } else {
        setError('Failed to load match.');
      }
    } catch (err) {
      setLoading(false);
      setError('Error fetching match.');
    }
  };

  const handleAnswerSubmit = (guess) => {
    if (!socket || roundResolved || gameOver) return;

    socket.emit('answer:submit', { matchId, guess });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading live game round..." />;
  }

  if (gameOver && finalSummary) {
    return (
      <div className="gameplay-container">
        <ResultCard
          results={finalSummary}
          currentUserId={currentUserId}
          onPlayAgain={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const playersList = matchData?.players || [];

  return (
    <div className="gameplay-container">
      {/* Top Live Scoreboard */}
      <Scoreboard
        players={playersList}
        currentUserId={currentUserId}
        scores={scores}
      />

      {/* Disconnection Warning Banner */}
      {disconnectNotice && (
        <div className="disconnect-alert animate-pop">
          <span>⚠️ {disconnectNotice}</span>
        </div>
      )}

      <ErrorMessage message={error} onDismiss={() => setError('')} />

      {/* Main Active Round Arena */}
      <div className="game-arena card">
        {/* Countdown Timer */}
        <CountdownTimer
          startTime={timerStartTime}
          duration={timerDuration}
        />

        {/* Active Clue Card */}
        {currentCard ? (
          <GameCard
            card={currentCard}
            roundNumber={currentRound}
            totalRounds={totalRounds}
          />
        ) : (
          <div className="waiting-for-round">
            <span className="waiting-icon">⏳</span>
            <h3>Preparing next round card...</h3>
          </div>
        )}

        {/* Round Resolution Feedback Overlay */}
        {roundResolved && resolutionData && (
          <div className={`resolution-banner animate-pop ${resolutionData.correct ? 'win-resolution' : 'timeout-resolution'}`}>
            {resolutionData.correct ? (
              <>
                <span className="res-icon">🎉</span>
                <div className="res-content">
                  <h3 className="res-title">
                    {resolutionData.winnerId === currentUserId
                      ? 'YOU GUESSED IT FIRST! (+1 CARD)'
                      : `${resolutionData.winnerUsername} GUESSED IT FIRST!`}
                  </h3>
                  <div className="res-answer">
                    Correct Title: <strong>{resolutionData.answer}</strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="res-icon">⏰</span>
                <div className="res-content">
                  <h3 className="res-title">TIME'S UP! NO ONE GUESSED IT</h3>
                  <div className="res-answer">
                    Correct Title: <strong>{resolutionData.answer}</strong>
                  </div>
                </div>
              </>
            )}
            <div className="next-round-cue">Next round starting shortly...</div>
          </div>
        )}

        {/* Wrong guess feedback */}
        {feedbackMsg && !roundResolved && (
          <div className={`guess-feedback ${isWrongGuess ? 'animate-shake' : ''}`}>
            {feedbackMsg}
          </div>
        )}

        {/* Player Answer Input */}
        <div className="answer-section">
          <AnswerInput
            onSubmit={handleAnswerSubmit}
            disabled={roundResolved || gameOver}
            placeholder={roundResolved ? 'Round resolved! Wait for next round...' : 'Type your Bollywood guess and press Enter...'}
          />
        </div>
      </div>
    </div>
  );
}
