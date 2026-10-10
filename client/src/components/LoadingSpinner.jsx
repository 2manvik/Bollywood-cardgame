import React from 'react';

export default function LoadingSpinner({ message = 'Loading...', fullScreen = false }) {
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--border-subtle)',
        borderTopColor: 'var(--accent-purple)',
        borderRadius: '50%',
        animation: 'radarSpin 0.8s linear infinite',
      }} />
      {message && <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {content}
      </div>
    );
  }

  return content;
}
