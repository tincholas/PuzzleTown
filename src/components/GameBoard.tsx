import React, { useRef } from 'react';
import {
  BoardValidationResult,
  Coord,
  DeductionHint,
  isFixedObstacle,
  LevelDefinition,
  PlaceableType,
  TileType
} from '../engine/types';
import { ActiveTool, TouchActionMode } from './BuildingTray';
import { RoadConnections, TileGraphic } from './TileGraphic';

interface GameBoardProps {
  level: LevelDefinition;
  grid: TileType[][];
  marks: boolean[][];
  excludedByCell: Set<PlaceableType>[][];
  activeTool: ActiveTool;
  actionMode: TouchActionMode;
  validation: BoardValidationResult;
  activeHint: DeductionHint | null;
  selectedCell: Coord | null;
  justPlacedCell?: Coord | null;
  newlyBuiltCells?: Record<string, number>;
  poppingEmptyCells?: Record<string, number>;
  isVictoryVisible?: boolean;
  animatingLine?: { axis: 'row' | 'col'; index: number } | null;
  onCellAction: (
    r: number,
    c: number,
    isDragContinue?: boolean,
    dragTargetValue?: boolean
  ) => void;
  onCellRightClick: (r: number, c: number, e: React.MouseEvent) => void;
  onLineClueClick: (axis: 'row' | 'col', index: number) => void;
}

function isRoadConnectable(tile: TileType): boolean {
  return (
    tile === 'road' ||
    tile === 'town_hall' ||
    tile === 'woodcutter' ||
    tile === 'farm'
  );
}

function computeRoadConnections(
  grid: TileType[][],
  r: number,
  c: number
): RoadConnections {
  const size = grid.length;
  return {
    up: r > 0 && isRoadConnectable(grid[r - 1][c]),
    down: r < size - 1 && isRoadConnectable(grid[r + 1][c]),
    left: c > 0 && isRoadConnectable(grid[r][c - 1]),
    right: c < size - 1 && isRoadConnectable(grid[r][c + 1])
  };
}

export const GameBoard: React.FC<GameBoardProps> = ({
  level,
  grid,
  marks,
  excludedByCell,
  activeTool,
  actionMode,
  validation,
  activeHint,
  selectedCell,
  justPlacedCell,
  newlyBuiltCells,
  poppingEmptyCells,
  isVictoryVisible = false,
  animatingLine,
  onCellAction,
  onCellRightClick,
  onLineClueClick
}) => {
  const size = level.size;

  // State for smooth mobile touch-swipe painting in Rule-Out / Empty-Mark modes
  const dragStateRef = useRef<{
    active: boolean;
    targetMarkValue: boolean;
    lastCoordKey: string;
  }>({
    active: false,
    targetMarkValue: true,
    lastCoordKey: ''
  });

  const isSwipeMarkMode =
    activeTool === 'mark_empty' || actionMode === 'rule_out';

  const handlePointerDownTile = (
    r: number,
    c: number,
    e: React.PointerEvent
  ) => {
    if (e.button !== 0) return; // left click or touch only
    const key = `${r},${c}`;

    if (isSwipeMarkMode && grid[r][c] === 'empty') {
      const currentlyMarked =
        activeTool === 'mark_empty'
          ? marks[r][c]
          : excludedByCell[r][c].has(activeTool) || marks[r][c];
      dragStateRef.current = {
        active: true,
        targetMarkValue: !currentlyMarked,
        lastCoordKey: key
      };
      onCellAction(r, c, false, !currentlyMarked);
    } else {
      dragStateRef.current = {
        active: false,
        targetMarkValue: true,
        lastCoordKey: key
      };
      onCellAction(r, c, false);
    }
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current.active || !isSwipeMarkMode) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const tileBtn = el.closest('[data-row][data-col]') as HTMLElement | null;
    if (!tileBtn) return;

    const r = Number(tileBtn.dataset.row);
    const c = Number(tileBtn.dataset.col);
    if (Number.isNaN(r) || Number.isNaN(c)) return;

    const key = `${r},${c}`;
    if (key === dragStateRef.current.lastCoordKey) return;

    dragStateRef.current.lastCoordKey = key;
    if (grid[r][c] === 'empty') {
      onCellAction(r, c, true, dragStateRef.current.targetMarkValue);
    }
  };

  const handleBoardPointerUp = () => {
    dragStateRef.current.active = false;
    dragStateRef.current.lastCoordKey = '';
  };

  return (
    <div
      className="board-wrapper"
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerCancel={handleBoardPointerUp}
    >
      <div
        className={`board-grid-with-clues ${isVictoryVisible ? 'board-solved' : ''}`}
        style={
          {
            '--grid-size': size
          } as React.CSSProperties
        }
      >
        {/* Top-left corner spacer without emoji */}
        <div className="clue-corner" title="Row & Column Building Totals" />

        {/* Column Clue Badges (Remaining Buildings Needed) */}
        {level.colClues.map((clue, c) => {
          const status = validation.colStatus[c];
          const current = validation.colCounts[c];
          const remaining = clue - current;
          const isColAnimating =
            animatingLine?.axis === 'col' && animatingLine?.index === c;

          return (
            <button
              key={`col-${c}`}
              type="button"
              className={`clue-badge col-clue status-${status} ${remaining === 0 ? 'clue-zero' : ''} ${isColAnimating ? 'clue-animating' : ''}`}
              onClick={() => onLineClueClick('col', c)}
              title={`Column ${c + 1}: ${remaining} more building(s) needed (${current}/${clue} placed). Tap to mark remaining empty spots.`}
            >
              <span className="clue-number">{remaining}</span>
            </button>
          );
        })}

        {/* Rows: Row Clue Badge (Remaining Buildings Needed) + Grid Cells */}
        {Array.from({ length: size }, (_, r) => {
          const rowStatus = validation.rowStatus[r];
          const rowCurrent = validation.rowCounts[r];
          const rowClue = level.rowClues[r];
          const rowRemaining = rowClue - rowCurrent;
          const isRowAnimating =
            animatingLine?.axis === 'row' && animatingLine?.index === r;

          return (
            <React.Fragment key={`row-${r}`}>
              <button
                type="button"
                className={`clue-badge row-clue status-${rowStatus} ${rowRemaining === 0 ? 'clue-zero' : ''} ${isRowAnimating ? 'clue-animating' : ''}`}
                onClick={() => onLineClueClick('row', r)}
                title={`Row ${r + 1}: ${rowRemaining} more building(s) needed (${rowCurrent}/${rowClue} placed). Tap to mark remaining empty spots.`}
              >
                <span className="clue-number">{rowRemaining}</span>
              </button>

              {Array.from({ length: size }, (_, c) => {
                const tile = grid[r][c];
                const isMarkedAllEmpty = marks[r][c];
                const cellExcludedSet = excludedByCell[r][c];
                const isRuledOutForActive =
                  !isMarkedAllEmpty &&
                  activeTool !== 'mark_empty' &&
                  cellExcludedSet.has(activeTool);

                const key = `${r},${c}`;
                const errors = validation.cellErrors[key];
                const hasError = Boolean(errors && errors.length > 0);
                const isSatisfied = Boolean(validation.cellSatisfied[key]);
                const isHinted =
                  activeHint?.r === r && activeHint?.c === c;
                const isSelected =
                  selectedCell?.r === r && selectedCell?.c === c;

                let bgClass = 'tile-bg-grass';
                if (tile === 'empty') {
                  if (isMarkedAllEmpty) {
                    const emptyIdx = ((r * 11 + c * 17 + level.id * 7) % 3) + 1;
                    bgClass = `tile-bg-empty-${emptyIdx}`;
                  } else {
                    const earthIdx = ((r * 7 + c * 13 + level.id * 5) % 3) + 1;
                    bgClass = `tile-bg-earth-${earthIdx}`;
                  }
                }

                const isNewlyBuilt = Boolean(newlyBuiltCells?.[key]);
                const buildTimestamp = newlyBuiltCells?.[key];
                const isPoppingEmpty = Boolean(poppingEmptyCells?.[key]);
                const isJustPlacedRoad =
                  tile === 'road' &&
                  justPlacedCell?.r === r &&
                  justPlacedCell?.c === c;
                const isRowRipple =
                  animatingLine?.axis === 'row' && animatingLine?.index === r;
                const isColRipple =
                  animatingLine?.axis === 'col' && animatingLine?.index === c;
                const rippleIdx = isRowRipple ? c : isColRipple ? r : 0;
                const isRippling = isRowRipple || isColRipple;

                const tileStyle: React.CSSProperties = {
                  ...(isRippling
                    ? ({ '--ripple-idx': rippleIdx } as React.CSSProperties)
                    : {}),
                  ...(isVictoryVisible
                    ? ({ '--wave-idx': r + c } as React.CSSProperties)
                    : {})
                };

                const roadConns =
                  tile === 'road'
                    ? computeRoadConnections(grid, r, c)
                    : undefined;

                return (
                  <button
                    key={key}
                    type="button"
                    data-row={r}
                    data-col={c}
                    style={tileStyle}
                    className={[
                      'board-tile',
                      bgClass,
                      isFixedObstacle(tile) ? 'tile-fixed' : 'tile-interactive',
                      hasError ? 'tile-error' : '',
                      isSatisfied ? 'tile-satisfied' : '',
                      isHinted ? 'tile-hinted' : '',
                      isSelected ? 'tile-selected' : '',
                      isJustPlacedRoad ? 'tile-just-placed' : '',
                      isNewlyBuilt ? 'tile-building-active' : '',
                      isPoppingEmpty ? 'tile-empty-popping' : '',
                      isRippling ? 'tile-line-ripple' : '',
                      isVictoryVisible ? 'tile-victory-wave' : '',
                      tile === 'empty' && isRuledOutForActive
                        ? 'tile-ruled-out-active'
                        : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onPointerDown={(e) => handlePointerDownTile(r, c, e)}
                    onContextMenu={(e) => onCellRightClick(r, c, e)}
                    title={
                      hasError
                        ? errors.join(' ')
                        : `Row ${r + 1}, Column ${c + 1}`
                    }
                  >
                    <TileGraphic
                      key={isNewlyBuilt ? `built-${buildTimestamp}` : `static-${tile}-${key}`}
                      type={tile}
                      markedEmpty={tile === 'empty' && isMarkedAllEmpty}
                      ruledOutForActiveType={
                        tile === 'empty' && isRuledOutForActive
                          ? activeTool
                          : null
                      }
                      excludedCount={cellExcludedSet.size}
                      roadConnections={roadConns}
                      variantSeed={r * 7 + c * 13}
                      isNewlyBuilt={isNewlyBuilt}
                    />
                    {hasError && (
                      <span
                        className="tile-error-badge"
                        aria-label="Rule violation"
                      >
                        !
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
