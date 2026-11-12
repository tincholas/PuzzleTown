import React from 'react';
import { Ban, Hammer } from 'lucide-react';
import {
  BUILDING_METADATA,
  LevelDefinition,
  PLACEABLE_TYPES,
  PlaceableType
} from '../engine/types';
import { BuildingFoundationSvg, MarkedGrassSvg, TileGraphic } from './TileGraphic';
import emptyBgImg from '../assets/empty_bg1.png';
import buildingImg from '../assets/building.png';

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
  const isNonExcludable = activeTool === 'road';
  const activeBuildingMeta =
    activeTool !== 'mark_empty' ? BUILDING_METADATA[activeTool] : null;

  const handleCardTap = (type: PlaceableType) => {
    if (type === 'road') {
      onSelectTool('road');
      onToggleActionMode('build');
      return;
    }
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
              (isGlobalEmptySelected && actionMode === 'build') ||
              (!isGlobalEmptySelected && (actionMode === 'build' || isNonExcludable))
                ? 'mode-pill-active-build'
                : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              onToggleActionMode('build');
            }}
          >
            <Hammer size={15} />
            <span>
              {isGlobalEmptySelected
                ? 'Empty Grass'
                : `Place ${activeBuildingMeta ? activeBuildingMeta.shortName : 'Tile'}`}
            </span>
          </button>

          <button
            type="button"
            disabled={isNonExcludable}
            className={[
              'mode-pill-btn',
              (isGlobalEmptySelected && actionMode === 'rule_out') ||
              (!isNonExcludable && actionMode === 'rule_out')
                ? 'mode-pill-active-ruleout'
                : '',
              isNonExcludable ? 'mode-pill-disabled' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (!isNonExcludable) {
                onToggleActionMode('rule_out');
              }
            }}
          >
            {isGlobalEmptySelected ? <Hammer size={15} /> : <Ban size={15} />}
            <span>
              {isGlobalEmptySelected
                ? 'Building'
                : `Not ${activeBuildingMeta ? activeBuildingMeta.shortName : 'Here'}`}
            </span>
          </button>
        </div>
        <span className="mode-hint-text">
          {isGlobalEmptySelected
            ? actionMode === 'rule_out'
              ? 'Tap or swipe squares that MUST contain a building (tap card to return to Empty)'
              : 'Tap or swipe to mark empty grass (no buildings) — tap card again for "Building"'
            : activeTool === 'road'
            ? 'Tap or drag to build Roads connecting village to Town Hall'
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
            const isRuleOutActive =
              type !== 'road' && isSelected && actionMode === 'rule_out';
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
                title={
                  type === 'road'
                    ? `${meta.name} (${rem} of ${total} left) — Connects buildings to Town Hall`
                    : `${meta.name} (${rem} of ${total} left) — Tap again to toggle "Not ${meta.shortName}" mode`
                }
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

          {/* Global "All Empty / Grass" or "Generic Building" tool */}
          <button
            type="button"
            className={[
              'tray-card tray-card-marker',
              isGlobalEmptySelected ? 'tray-card-selected' : '',
              isGlobalEmptySelected && actionMode === 'rule_out' ? 'tray-card-ruleout' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (activeTool === 'mark_empty') {
                onToggleActionMode(actionMode === 'build' ? 'rule_out' : 'build');
              } else {
                onSelectTool('mark_empty');
              }
            }}
            title={
              isGlobalEmptySelected && actionMode === 'rule_out'
                ? 'Building Foundation: Squares that MUST contain a building (tap again for Empty Grass)'
                : 'Empty Grass: Squares where NO building can go (tap again for Building)'
            }
          >
            {isGlobalEmptySelected && actionMode === 'rule_out' && (
              <span className="tray-ruleout-tag" aria-label="Building Mode">
                🏗️
              </span>
            )}
            <div className="tray-card-art">
              {isGlobalEmptySelected && actionMode === 'rule_out' ? (
                <img
                  src={buildingImg}
                  alt="Building"
                  className="tray-building-img"
                  draggable={false}
                />
              ) : (
                <img
                  src={emptyBgImg}
                  alt="Empty"
                  className="tray-empty-img"
                  draggable={false}
                />
              )}
            </div>
            <span className="tray-card-label">
              {isGlobalEmptySelected && actionMode === 'rule_out' ? 'Building' : 'Empty'}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};
