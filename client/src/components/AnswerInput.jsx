import React, { useState, useRef, useEffect } from 'react';
import './AnswerInput.css';

export default function AnswerInput({ onSubmit, disabled, placeholder = 'Enter movie or song title...' }) {
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guess.trim() || disabled || submitting) return;

    setSubmitting(true);
    await onSubmit(guess.trim());
    setGuess('');
    setSubmitting(false);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <div className="answer-input-container">
        <input
          ref={inputRef}
          type="text"
          className="answer-input"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || submitting}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className="btn btn-primary answer-btn"
          disabled={!guess.trim() || disabled || submitting}
        >
          <span>SUBMIT</span>
          <span className="btn-arrow">➔</span>
        </button>
      </div>
    </form>
  );
}
