import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge animate-pop">
          <span>⚡ REAL-TIME MULTIPLAYER TRIVIA</span>
        </div>

        <h1 className="hero-title">
          GUESS <span className="title-gradient">IT!</span>
        </h1>

        <p className="hero-tagline">
          The fast-paced, 2-player real-time Bollywood guessing showdown. Decode iconic movies and chartbuster songs from emoji clues before your opponent does!
        </p>

        {/* Clue teaser preview */}
        <div className="hero-teaser-card animate-pop">
          <div className="teaser-clue">🚂 ❤️ 👰</div>
          <div className="teaser-answer">Can you name this legendary movie?</div>
          <span className="teaser-pill">3... 2... 1... DDLJ!</span>
        </div>

        <div className="hero-cta-group">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">
              🎮 Jump Into Dashboard ({user?.username})
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">
                🚀 Play Free Now
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                🔑 Player Login
              </Link>
            </>
          )}
        </div>
      </section>

      {/* How it Works / Core Game Loop */}
      <section className="how-it-works-section">
        <h2 className="section-title text-center">HOW IT WORKS</h2>
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-num">01</span>
            <span className="step-icon">⚔️</span>
            <h3>Match 1-on-1</h3>
            <p>Enter random matchmaking or send a live challenge to your friend.</p>
          </div>
          <div className="step-card">
            <span className="step-num">02</span>
            <span className="step-icon">🧩</span>
            <h3>Decode The Emoji Clue</h3>
            <p>Both players see the exact same clue simultaneously with a 20s server timer.</p>
          </div>
          <div className="step-card">
            <span className="step-num">03</span>
            <span className="step-icon">⚡</span>
            <h3>First Correct Wins</h3>
            <p>The first player whose answer is accepted by the server claims the card.</p>
          </div>
          <div className="step-card">
            <span className="step-num">04</span>
            <span className="step-icon">🏆</span>
            <h3>Collect The Most Cards</h3>
            <p>Outscore your rival across 20 rounds to clinch the victory!</p>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="categories-preview-section">
        <h2 className="section-title text-center">GAME MODES</h2>
        <div className="categories-grid">
          <div className="preview-cat-card">
            <span className="preview-cat-icon">🎬</span>
            <h3>Bollywood Movies</h3>
            <p>From timeless classics like Sholay and DDLJ to modern masterpieces like 3 Idiots, Dangal, and Gully Boy.</p>
            <div className="sample-clue">Sample: 👨 👧👧 🤼 🏆 ➔ Dangal</div>
          </div>
          <div className="preview-cat-card">
            <span className="preview-cat-icon">🎵</span>
            <h3>Bollywood Songs</h3>
            <p>Legendary rain melodies, upbeat Punjabi dance anthems, and timeless romantic ballads.</p>
            <div className="sample-clue">Sample: 🌧️ 💛 💃 🔥 ➔ Tip Tip Barsa Paani</div>
          </div>
          <div className="preview-cat-card">
            <span className="preview-cat-icon">🎲</span>
            <h3>Random Mix</h3>
            <p>The ultimate test of Bollywood trivia. Alternates dynamically between movies and songs every round!</p>
            <div className="sample-clue">Sample: Alternate Movies & Songs</div>
          </div>
        </div>
      </section>
    </div>
  );
}
