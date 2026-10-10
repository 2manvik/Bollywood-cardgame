import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.25rem',
    }}>
      <span style={{ fontSize: '4.5rem' }}>🎬 ❓</span>
      <h1 className="title-gradient" style={{ fontSize: '3rem' }}>404 - Card Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px' }}>
        The scene you're looking for seems to have been left on the cutting room floor.
      </p>
      <Link to="/" className="btn btn-primary btn-lg" style={{ marginTop: '1rem' }}>
        Return to Home Scene
      </Link>
    </div>
  );
}
