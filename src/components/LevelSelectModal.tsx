import React from 'react';
import { Sparkles, Star, X } from 'lucide-react';
import { CAMPAIGN_CONFIGS, getCampaignLevel } from '../engine/campaignLevels';

interface LevelSelectModalProps {
  currentLevelId: number;
  starsByLevel: Record<number, number>;
  onSelectLevel: (id: number) => void;
  onGenerateBonus: (size: 5 | 6) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  starsByLevel,
  onSelectLevel,
  onGenerateBonus,
  onClose
}) => {
  const chapters = [1, 2, 3, 4, 5].map((ch) => {
    const configs = CAMPAIGN_CONFIGS.filter((c) => c.chapter === ch);
    const levels = configs.map((cfg) => getCampaignLevel(cfg.id));
    return {
      chapter: ch,
      name: levels[0]?.chapterName ?? `Chapter ${ch}`,
      levels
    };
  });

  const totalPossibleStars = CAMPAIGN_CONFIGS.length * 3;
  const totalStars = Object.values(starsByLevel).reduce((a, b) => a + b, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card levels-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Select Level</h2>
            <p className="modal-subtitle">
              Total Stars Earned: <strong>{totalStars} / {totalPossibleStars}</strong> ★
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          {chapters.map((ch) => (
            <div key={ch.chapter} className="chapter-section">
              <div className="chapter-section-header">
                <h3 className="chapter-heading">
                  Chapter {ch.chapter}: {ch.name}
                </h3>
                <span className="chapter-count-tag">{ch.levels.length} Levels</span>
              </div>
              <div className="level-grid">
                {ch.levels.map((lvl) => {
                  const stars = starsByLevel[lvl.id] ?? 0;
                  const isCurrent = lvl.id === currentLevelId;
                  const diffClass = `diff-${lvl.difficulty.toLowerCase()}`;
                  const densPct = Math.round((lvl.density ?? 0) * 100);

                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      className={[
                        'level-card-btn',
                        isCurrent ? 'level-card-current' : '',
                        stars > 0 ? 'level-card-completed' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        onSelectLevel(lvl.id);
                        onClose();
                      }}
                    >
                      <div className="level-card-top">
                        <span className="level-num">#{lvl.id}</span>
                        <span className="level-size-tag">
                          {lvl.size}×{lvl.size}
                        </span>
                      </div>

                      <div className="level-card-title">{lvl.title}</div>

                      <div className="level-card-meta">
                        <span className={`diff-pill ${diffClass}`}>
                          {lvl.difficulty} ({lvl.difficultyScore ?? 50})
                        </span>
                        <span className="density-tag" title="Board Density">
                          {densPct}%
                        </span>
                      </div>

                      <div className="level-card-stars">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            size={13}
                            className={
                              s <= stars ? 'star-icon filled' : 'star-icon empty'
                            }
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Endless Procedural Bonus Charter Generator */}
          <div className="bonus-generator-banner">
            <div className="bonus-info">
              <h4>
                <Sparkles size={18} /> Endless Charter Generator
              </h4>
              <p>
                Generate a fresh, verified 100% logic-deducible puzzle on the fly!
              </p>
            </div>
            <div className="bonus-buttons">
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => {
                  onGenerateBonus(5);
                  onClose();
                }}
              >
                New 5×5 Village
              </button>
              <button
                type="button"
                className="action-pill-btn primary"
                onClick={() => {
                  onGenerateBonus(6);
                  onClose();
                }}
              >
                New 6×6 Town
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
