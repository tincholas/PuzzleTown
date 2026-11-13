import React from 'react';
import { Music, Smartphone, Volume2, VolumeX, X } from 'lucide-react';

interface SettingsModalProps {
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  vibrationEnabled: boolean;
  onToggleVibration: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  sfxEnabled,
  onToggleSfx,
  musicEnabled,
  onToggleMusic,
  vibrationEnabled,
  onToggleVibration,
  onClose
}) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Settings</h2>
            <p className="modal-subtitle">Audio & Haptic Feedback</p>
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

        <div className="modal-body settings-modal-body">
          <div className="settings-list">
            {/* 1. Sound Effects Toggle */}
            <div className="settings-item">
              <div className="settings-item-icon-box">
                {sfxEnabled ? (
                  <Volume2 size={24} className="settings-icon" />
                ) : (
                  <VolumeX size={24} className="settings-icon muted" />
                )}
              </div>
              <div className="settings-item-info">
                <h4>Sound Effects</h4>
                <p>Carpentry construction, taps, and clues</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={sfxEnabled}
                  onChange={onToggleSfx}
                  aria-label="Toggle Sound Effects"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* 2. Relaxing Village Music Toggle */}
            <div className="settings-item">
              <div className="settings-item-icon-box">
                <Music
                  size={24}
                  className={`settings-icon ${!musicEnabled ? 'muted' : ''}`}
                />
              </div>
              <div className="settings-item-info">
                <h4>Village Music</h4>
                <p>Calm, happy acoustic marimba melody</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={musicEnabled}
                  onChange={onToggleMusic}
                  aria-label="Toggle Village Music"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* 3. Haptic Vibration Toggle */}
            <div className="settings-item">
              <div className="settings-item-icon-box">
                <Smartphone
                  size={24}
                  className={`settings-icon ${!vibrationEnabled ? 'muted' : ''}`}
                />
              </div>
              <div className="settings-item-info">
                <h4>Haptic Vibration</h4>
                <p>Tactile device buzzes when placing tiles</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={vibrationEnabled}
                  onChange={onToggleVibration}
                  aria-label="Toggle Haptic Vibration"
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="settings-footer-banner">
            <span className="settings-version-tag">PuzzleTown v1.0.0</span>
            <p>100 Campaign Levels • 100% Offline Logic Deductions</p>
          </div>
        </div>
      </div>
    </div>
  );
};
