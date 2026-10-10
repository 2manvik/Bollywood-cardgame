import React from 'react';
import './CategoryCard.css';

export default function CategoryCard({ category, selected, onSelect }) {
  return (
    <div
      className={`category-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(category.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(category.id);
      }}
    >
      <div className="category-top">
        <span className="category-icon">{category.icon}</span>
        <span className="badge badge-purple">{category.badge}</span>
      </div>
      <h3 className="category-title">{category.name}</h3>
      <p className="category-tagline">{category.tagline}</p>
      <p className="category-description">{category.description}</p>
      {category.cardCount !== undefined && (
        <div className="category-footer">
          <span className="card-count">{category.cardCount} cards in bank</span>
        </div>
      )}
      <div className="category-indicator">
        {selected ? '✓ Selected' : 'Select'}
      </div>
    </div>
  );
}
