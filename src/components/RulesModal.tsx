import React, { useState } from 'react';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { TileGraphic } from './TileGraphic';
import { CheckUpdateResult, pwaManager } from '../pwaManager';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [checking, setChecking] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<CheckUpdateResult | null>(
    null
  );
  const hasUpdate = pwaManager.getHasUpdate();

  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateResult(null);
    const result = await pwaManager.checkForUpdate();
    setChecking(false);
    setUpdateResult(result);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card rules-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>PuzzleTown Charter & Rules</h2>
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
          <div className="rules-general-banner">
            <h3>General Village Laws (All Buildings)</h3>
            <ul>
              <li>
                <strong>Row & Column Numbers:</strong> Show how many{' '}
                <strong>more Buildings</strong> still need to be placed in that
                row or column{' '}
                <em>
                  (counting down to 0 as you place them; Trees, Rocks, and Roads
                  do not count)
                </em>
                .
              </li>
              <li>
                <strong>Max 1 of Each Type per Line:</strong> No row or column
                can contain 2 of the <strong>same</strong> building type.
              </li>
              <li>
                <strong>Personal Space (8-Way):</strong> No building can have
                another building of the <strong>same type</strong> in any of its
                8 surrounding squares (orthogonal or diagonal).
              </li>
              <li>
                <strong>No Guessing Required:</strong> Every level has a single
                unique solution that can be 100% logically deduced!
              </li>
            </ul>
          </div>

          <div className="rules-grid">
            <div className="rule-item">
              <div className="rule-icon-box tile-sand">
                <TileGraphic type="woodcutter" />
              </div>
              <div className="rule-text">
                <h4>Woodcutter</h4>
                <p>
                  Must be orthogonally next to a <strong>Tree</strong> AND a{' '}
                  <strong>House</strong>. When a Town Hall is in the level, it
                  must also connect to the Town Hall via a <strong>Road</strong>{' '}
                  path.
                </p>
              </div>
            </div>

            <div className="rule-item">
              <div className="rule-icon-box tile-sand">
                <TileGraphic type="house" />
              </div>
              <div className="rule-text">
                <h4>House</h4>
                <p>
                  Must be orthogonally next to a <strong>Woodcutter</strong> or
                  a <strong>Farm</strong>. Every Woodcutter and Farm needs a
                  House next to it!
                </p>
              </div>
            </div>

            <div className="rule-item">
              <div className="rule-icon-box tile-sand">
                <TileGraphic type="farm" />
              </div>
              <div className="rule-text">
                <h4>Farm</h4>
                <p>
                  Must be orthogonally next to a <strong>House</strong>. When a
                  Town Hall is in the level, it must also connect to the Town
                  Hall via a <strong>Road</strong> path.
                </p>
              </div>
            </div>

            <div className="rule-item">
              <div className="rule-icon-box tile-sand">
                <TileGraphic type="town_hall" />
              </div>
              <div className="rule-text">
                <h4>Town Hall</h4>
                <p>
                  <strong>Clear Perimeter:</strong> Must not have any Buildings,
                  Trees, or Rocks in any of its 8 surrounding squares.{' '}
                  <strong>Roads</strong> may connect orthogonally to it.
                </p>
              </div>
            </div>

            <div className="rule-item">
              <div className="rule-icon-box tile-sand">
                <TileGraphic type="road" />
              </div>
              <div className="rule-text">
                <h4>Road Path</h4>
                <p>
                  Connects <strong>Woodcutters</strong> and{' '}
                  <strong>Farms</strong> orthogonally to the{' '}
                  <strong>Town Hall</strong>. Roads can turn 90° corners and
                  branch! Exempt from row/column building counts.
                </p>
              </div>
            </div>

            <div className="rule-item">
              <div className="rule-icon-box tile-grass">
                <TileGraphic type="tree" />
              </div>
              <div className="rule-text">
                <h4>Trees & Rocks</h4>
                <p>
                  Pre-placed terrain on the board. <strong>Every Tree</strong>{' '}
                  must have a <strong>Woodcutter</strong> orthogonally next to
                  it! Rocks block buildings and roads.
                </p>
              </div>
            </div>
          </div>

          {/* App Information & Version Section */}
          <div className="rules-app-info-section">
            <div className="rules-app-info-left">
              <span className="app-version-title">
                PuzzleTown v{__APP_VERSION__}
              </span>
              <span className="app-build-date">Build {__BUILD_DATE__}</span>
            </div>

            <div className="rules-app-info-actions">
              {hasUpdate ? (
                <button
                  type="button"
                  className="update-check-btn ready"
                  onClick={() => pwaManager.applyUpdate()}
                >
                  <Sparkles size={16} />
                  <span>Update Ready (Reload)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`update-check-btn ${checking ? 'checking' : ''}`}
                  onClick={handleCheckUpdate}
                  disabled={checking}
                >
                  <RefreshCw size={15} className={checking ? 'spin' : ''} />
                  <span>{checking ? 'Checking...' : 'Check for Updates'}</span>
                </button>
              )}
            </div>
            {updateResult && (
              <div className={`update-status-msg ${updateResult.status}`}>
                {updateResult.status === 'up-to-date' && <Check size={15} />}
                <span>{updateResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
