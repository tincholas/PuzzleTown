import React from 'react';
import {
  BookOpen,
  Grid,
  Lightbulb,
  RotateCcw,
  Star,
  Undo2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { LevelDefinition } from '../engine/types';

interface HeaderBarProps {
  level: LevelDefinition;
  currentStars: number;
  canUndo: boolean;
  isMuted?: boolean;
  onUndo: () => void;
  onReset: () => void;
  onHint: () => void;
  onOpenRules: () => void;
  onOpenLevels: () => void;
  onToggleSound?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  level,
  currentStars,
  canUndo,
  isMuted = false,
  onUndo,
  onReset,
  onHint,
  onOpenRules,
  onOpenLevels,
  onToggleSound
}) => {
  return (
    <header className="header-bar">
      <div className="header-left-and-actions">
        {/* Brand + Live Stars */}
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

        {/* Circular Tactile Action Buttons */}
        <div className="header-actions">
          <button
            type="button"
            className="round-btn btn-yellow"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last move"
            aria-label="Undo"
          >
            <Undo2 size={21} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            className="round-btn btn-teal"
            onClick={onReset}
            title="Reset board"
            aria-label="Reset"
          >
            <RotateCcw size={21} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            className="round-btn btn-amber"
            onClick={onHint}
            title="Get a logical deduction hint"
            aria-label="Hint"
          >
            <Lightbulb size={21} strokeWidth={2.6} />
          </button>
          {onToggleSound && (
            <button
              type="button"
              className={`round-btn btn-purple ${isMuted ? 'muted' : ''}`}
              onClick={onToggleSound}
              title={isMuted ? 'Turn Sound On' : 'Mute Sound'}
              aria-label={isMuted ? 'Turn Sound On' : 'Mute Sound'}
            >
              {isMuted ? (
                <VolumeX size={20} strokeWidth={2.6} />
              ) : (
                <Volume2 size={20} strokeWidth={2.6} />
              )}
            </button>
          )}
          <button
            type="button"
            className="round-btn btn-blue"
            onClick={onOpenRules}
            title="Building Rules & Guide"
            aria-label="Rules"
          >
            <BookOpen size={20} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            className="round-btn btn-coral"
            onClick={onOpenLevels}
            title="Select Level"
            aria-label="Select Level"
          >
            <Grid size={20} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {/* Center Carved Wooden Plaque */}
      <div
        className="center-plaque"
        onClick={onOpenLevels}
        role="button"
        tabIndex={0}
        title="Click to select level"
      >
        <div className="plaque-inner">
          <div className="plaque-top-row">
            <span className="plaque-title">{level.chapterName}</span>
            <span className={`diff-pill diff-${level.difficulty.toLowerCase()}`}>
              {level.difficulty} ({level.difficultyScore ?? 50})
            </span>
          </div>
          <div className="plaque-subtitle">
            Level {level.id}: {level.title}
            {level.density ? ` • ${Math.round(level.density * 100)}% dense` : ''}
          </div>
        </div>
      </div>
    </header>
  );
};
