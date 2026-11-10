import React from 'react';
import { Ban, Hammer } from 'lucide-react';
import {
  BUILDING_METADATA,
  LevelDefinition,
  PLACEABLE_TYPES,
  PlaceableType
} from '../engine/types';
import { MarkedGrassSvg, TileGraphic } from './TileGraphic';

export type ActiveTool = PlaceableType | 'mark_empty';
export type TouchActionMode = 'build' | 'rule_out';

interface BuildingTrayProps {
  level: LevelDefinition;
  remainingInventory: Record<PlaceableType, number>;
  activeTool: ActiveTool;
  actionMode: TouchActionMode;
  onSelectTool: (tool: ActiveTool) => void;
  onToggleActionMode: (mode: TouchActionMode) => void;
}

export const BuildingTray: React.FC<BuildingTrayProps> = ({
  level,
  remainingInventory,
  activeTool,
  actionMode,
  onSelectTool,
  onToggleActionMode
}) => {
  const activeTypes = PLACEABLE_TYPES.filter(
    (t) => level.inventory[t] > 0
  );

  const isGlobalEmptySelected = activeTool === 'mark_empty';
  const activeBuildingMeta =
    activeTool !== 'mark_empty' ? BUILDING_METADATA[activeTool] : null;

  const handleCardTap = (type: PlaceableType) => {
    if (activeTool === type) {
      // Tapping the already-selected building card flips between Build & Rule-Out mode!
      onToggleActionMode(actionMode === 'build' ? 'rule_out' : 'build');
    } else {
      onSelectTool(type);
    }
  };

  return (
    <footer className="tray-outer">
      {/* Thumb-friendly Mobile Mode Bar right above the tray */}
      <div className="tray-mode-bar">
        <div className="mode-segmented-control" role="group" aria-label="Touch Action Mode">
          <button
            type="button"
            className={[
              'mode-pill-btn',
              !isGlobalEmptySelected && actionMode === 'build'
                ? 'mode-pill-active-build'
                : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (isGlobalEmptySelected) {
                onSelectTool(activeTypes[0] ?? 'house');
              }
              onToggleActionMode('build');
            }}
          >
            <Hammer size={15} />
            <span>
              Place{' '}
              {activeBuildingMeta ? activeBuildingMeta.shortName : 'Tile'}
            </span>
          </button>

          <button
            type="button"
            className={[
              'mode-pill-btn',
              !isGlobalEmptySelected && actionMode === 'rule_out'
                ? 'mode-pill-active-ruleout'
                : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (isGlobalEmptySelected) {
                onSelectTool(activeTypes[0] ?? 'house');
              }
              onToggleActionMode('rule_out');
            }}
          >
            <Ban size={15} />
            <span>
              Not{' '}
              {activeBuildingMeta ? activeBuildingMeta.shortName : 'Here'}
            </span>
          </button>
        </div>
        <span className="mode-hint-text">
          {isGlobalEmptySelected
            ? 'Tap or swipe to mark empty grass (no buildings)'
            : actionMode === 'rule_out'
            ? `Tap or swipe squares that CAN'T be ${activeBuildingMeta?.name}`
            : `Tap a square to place ${activeBuildingMeta?.name} (tap card again for "Not ${activeBuildingMeta?.shortName}")`}
        </span>
      </div>

      <div className="wooden-tray">
        <div className="tray-items">
          {activeTypes.map((type) => {
            const rem = remainingInventory[type];
            const total = level.inventory[type];
            const isSelected = activeTool === type;
            const isRuleOutActive = isSelected && actionMode === 'rule_out';
            const meta = BUILDING_METADATA[type];

            return (
              <button
                key={type}
                type="button"
                className={[
                  'tray-card',
                  isSelected ? 'tray-card-selected' : '',
                  isRuleOutActive ? 'tray-card-ruleout' : '',
                  rem === 0 ? 'tray-card-depleted' : '',
                  rem < 0 ? 'tray-card-over' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleCardTap(type)}
                title={`${meta.name} (${rem} of ${total} left) — Tap again to toggle "Not ${meta.shortName}" mode`}
              >
                {isRuleOutActive && (
                  <span className="tray-ruleout-tag" aria-label="Rule Out Mode">
                    🚫
                  </span>
                )}
                <div className="tray-card-art">
                  <TileGraphic type={type} />
                </div>
                <span className="tray-card-label">
                  {isRuleOutActive ? `No ${meta.shortName}` : meta.shortName}
                </span>
                <span
                  className={[
                    'tray-count-badge',
                    rem === 0 ? 'badge-zero' : '',
                    rem < 0 ? 'badge-negative' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {rem}
                </span>
              </button>
            );
          })}

          {/* Global "All Empty / Grass" tool */}
          <button
            type="button"
            className={[
              'tray-card tray-card-marker',
              isGlobalEmptySelected ? 'tray-card-selected' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectTool('mark_empty')}
            title="Empty Grass: Mark squares where NO building can go"
          >
            <div className="tray-card-art">
              <MarkedGrassSvg />
            </div>
            <span className="tray-card-label">Empty</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
