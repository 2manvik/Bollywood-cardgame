import React, { useState, useEffect } from 'react';
import './CountdownTimer.css';

export default function CountdownTimer({ startTime, duration = 20, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!startTime) {
      setTimeLeft(duration);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (typeof onExpire === 'function') onExpire();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [startTime, duration, onExpire]);

  const percentage = Math.max(0, Math.min(100, (timeLeft / duration) * 100));
  const isUrgent = timeLeft <= 5;

  return (
    <div className={`countdown-wrapper ${isUrgent ? 'urgent' : ''}`}>
      <div className="countdown-bar-bg">
        <div
          className="countdown-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="countdown-display">
        <span className="countdown-icon">⏱️</span>
        <span className="countdown-text">
          TIME LEFT: <strong>{timeLeft}s</strong>
        </span>
      </div>
    </div>
  );
}
