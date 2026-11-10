import React from 'react';
import {
  BookOpen,
  Grid,
  Lightbulb,
  RotateCcw,
  Star,
  Undo2
} from 'lucide-react';
import { LevelDefinition } from '../engine/types';

interface HeaderBarProps {
  level: LevelDefinition;
  currentStars: number;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onHint: () => void;
  onOpenRules: () => void;
  onOpenLevels: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  level,
  currentStars,
  canUndo,
  onUndo,
  onReset,
  onHint,
  onOpenRules,
  onOpenLevels
}) => {
  return (
    <header className="header-bar">
      {/* Top-Left Brand + Star Badge */}
      <div className="header-left">
        <div className="brand-title">PuzzleTown</div>
        <div
          className="star-badge"
          title="Earn 3 stars by solving without hints or errors"
        >
          {[1, 2, 3].map((idx) => (
            <Star
              key={idx}
              size={18}
              className={
                idx <= currentStars ? 'star-icon filled' : 'star-icon empty'
              }
            />
          ))}
        </div>
      </div>

      {/* Center Carved Wooden Plaque */}
      <div className="center-plaque" onClick={onOpenLevels} role="button" tabIndex={0}>
        <div className="plaque-inner">
          <div className="plaque-title">{level.chapterName}</div>
          <div className="plaque-subtitle">
            Level {level.id}: {level.title}
          </div>
        </div>
      </div>

      {/* Top-Right Circular Tactile Action Buttons */}
      <div className="header-actions">
        <button
          type="button"
          className="round-btn btn-yellow"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last move"
          aria-label="Undo"
        >
          <Undo2 size={22} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="round-btn btn-teal"
          onClick={onReset}
          title="Reset board"
          aria-label="Reset"
        >
          <RotateCcw size={22} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="round-btn btn-amber"
          onClick={onHint}
          title="Get a logical deduction hint"
          aria-label="Hint"
        >
          <Lightbulb size={22} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="round-btn btn-blue"
          onClick={onOpenRules}
          title="Building Rules & Guide"
          aria-label="Rules"
        >
          <BookOpen size={21} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="round-btn btn-coral"
          onClick={onOpenLevels}
          title="Select Level"
          aria-label="Select Level"
        >
          <Grid size={21} strokeWidth={2.6} />
        </button>
      </div>
    </header>
  );
};
