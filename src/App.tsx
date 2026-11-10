import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Lightbulb,
  Sparkles,
  Star
} from 'lucide-react';
import {
  ActiveTool,
  BuildingTray,
  TouchActionMode
} from './components/BuildingTray';
import { GameBoard } from './components/GameBoard';
import { HeaderBar } from './components/HeaderBar';
import { LevelSelectModal } from './components/LevelSelectModal';
import { RulesModal } from './components/RulesModal';
import {
  CAMPAIGN_CONFIGS,
  generateBonusCustomLevel,
  getCampaignLevel
} from './engine/campaignLevels';
import { getNextHint } from './engine/solver';
import {
  Coord,
  DeductionHint,
  isFixedObstacle,
  LevelDefinition,
  PLACEABLE_TYPES,
  PlaceableType,
  TileType
} from './engine/types';
import { validateBoard } from './engine/validator';
import {
  isSoundMuted,
  playErrorSound,
  playLineClueRippleSound,
  playMarkEmptySound,
  playPlaceBuildingSound,
  playPlaceRoadSound,
  playVictorySound,
  toggleSound
} from './utils/sound';

interface HistorySnapshot {
  grid: TileType[][];
  marks: boolean[][];
  excludedByCell: Set<PlaceableType>[][];
}

const STORAGE_KEY_PROGRESS = 'puzzletown_progress_v1';

interface SavedProgress {
  currentLevelId: number;
  starsByLevel: Record<number, number>;
}

function loadSavedProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currentLevelId: parsed.currentLevelId ?? 1,
        starsByLevel: parsed.starsByLevel ?? {}
      };
    }
  } catch {
    // ignore storage errors
  }
  return { currentLevelId: 1, starsByLevel: {} };
}

function createEmptyExcludedGrid(size: number): Set<PlaceableType>[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => new Set<PlaceableType>())
  );
}

function cloneExcludedGrid(
  src: Set<PlaceableType>[][]
): Set<PlaceableType>[][] {
  return src.map((row) => row.map((s) => new Set(s)));
}

export const App: React.FC = () => {
  const [savedProgress, setSavedProgress] =
    useState<SavedProgress>(loadSavedProgress);

  const [level, setLevel] = useState<LevelDefinition>(() =>
    getCampaignLevel(savedProgress.currentLevelId)
  );

  const [grid, setGrid] = useState<TileType[][]>(() =>
    level.initialGrid.map((r) => [...r])
  );
  const [marks, setMarks] = useState<boolean[][]>(() =>
    Array.from({ length: level.size }, () => Array(level.size).fill(false))
  );
  const [excludedByCell, setExcludedByCell] = useState<
    Set<PlaceableType>[][]
  >(() => createEmptyExcludedGrid(level.size));

  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const [activeTool, setActiveTool] = useState<ActiveTool>(() => {
    const firstActive = PLACEABLE_TYPES.find((t) => level.inventory[t] > 0);
    return firstActive ?? 'house';
  });

  const [actionMode, setActionMode] = useState<TouchActionMode>('build');

  const [activeHint, setActiveHint] = useState<DeductionHint | null>(null);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [mistakesMade, setMistakesMade] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<Coord | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showLevelsModal, setShowLevelsModal] = useState<boolean>(false);
  const [dismissedTip, setDismissedTip] = useState<boolean>(false);

  // Animations & Sound
  const [justPlacedCell, setJustPlacedCell] = useState<Coord | null>(null);
  const [animatingLine, setAnimatingLine] = useState<{
    axis: 'row' | 'col';
    index: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => isSoundMuted());

  const handleToggleSound = () => {
    const nextMuted = !toggleSound();
    setIsMuted(nextMuted);
  };

  const activeLevelPlaceables = useMemo(
    () => PLACEABLE_TYPES.filter((t) => level.inventory[t] > 0),
    [level]
  );

  // Save progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(savedProgress));
    } catch {
      // ignore storage errors
    }
  }, [savedProgress]);

  const validation = useMemo(
    () => validateBoard(grid, level),
    [grid, level]
  );

  // Automatically record star rating & trigger victory confetti/sound when solved
  useEffect(() => {
    if (validation.isSolved) {
      playVictorySound();
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.62 },
        colors: ['#f59e0b', '#10b981', '#ea580c', '#fef3c7', '#38bdf8', '#a78bfa']
      });
      const t1 = setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.7 },
          colors: ['#f59e0b', '#10b981', '#ea580c', '#fef3c7']
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.7 },
          colors: ['#f59e0b', '#10b981', '#ea580c', '#38bdf8']
        });
      }, 250);

      const earnedStars =
        hintsUsed === 0 && mistakesMade === 0
          ? 3
          : hintsUsed <= 1
          ? 2
          : 1;

      setSavedProgress((prev) => {
        const existing = prev.starsByLevel[level.id] ?? 0;
        if (earnedStars > existing) {
          return {
            ...prev,
            starsByLevel: {
              ...prev.starsByLevel,
              [level.id]: earnedStars
            }
          };
        }
        return prev;
      });

      return () => clearTimeout(t1);
    }
  }, [validation.isSolved, hintsUsed, mistakesMade, level.id]);

  const startNewLevel = (newLevel: LevelDefinition) => {
    setLevel(newLevel);
    setGrid(newLevel.initialGrid.map((r) => [...r]));
    setMarks(
      Array.from({ length: newLevel.size }, () =>
        Array(newLevel.size).fill(false)
      )
    );
    setExcludedByCell(createEmptyExcludedGrid(newLevel.size));
    setHistory([]);
    const firstActive = PLACEABLE_TYPES.find(
      (t) => newLevel.inventory[t] > 0
    );
    setActiveTool(firstActive ?? 'house');
    setActionMode('build');
    setActiveHint(null);
    setHintsUsed(0);
    setMistakesMade(0);
    setSelectedCell(null);
    setDismissedTip(false);

    if (newLevel.id <= CAMPAIGN_CONFIGS.length) {
      setSavedProgress((prev) => ({
        ...prev,
        currentLevelId: newLevel.id
      }));
    }
  };

  const handleSelectCampaignLevel = (id: number) => {
    startNewLevel(getCampaignLevel(id));
  };

  const handleGenerateBonus = (size: 5 | 6) => {
    const seed = Date.now() % 100000;
    const bonusLevel = generateBonusCustomLevel(size, seed);
    startNewLevel(bonusLevel);
  };

  const pushHistory = () => {
    setHistory((prev) => [
      ...prev,
      {
        grid: grid.map((r) => [...r]),
        marks: marks.map((r) => [...r]),
        excludedByCell: cloneExcludedGrid(excludedByCell)
      }
    ]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setGrid(last.grid);
    setMarks(last.marks);
    setExcludedByCell(last.excludedByCell);
    setHistory((prev) => prev.slice(0, -1));
    setActiveHint(null);
  };

  const handleReset = () => {
    pushHistory();
    setGrid(level.initialGrid.map((r) => [...r]));
    setMarks(
      Array.from({ length: level.size }, () => Array(level.size).fill(false))
    );
    setExcludedByCell(createEmptyExcludedGrid(level.size));
    setActiveHint(null);
  };

  const handleHint = () => {
    const hint = getNextHint(grid, marks, level);
    if (hint) {
      setActiveHint(hint);
      setHintsUsed((h) => h + 1);
      setSelectedCell({ r: hint.r, c: hint.c });
    }
  };

  const applyHintMove = () => {
    if (!activeHint) return;
    pushHistory();
    const { r, c, action, tileType } = activeHint;
    if (action === 'place' && tileType) {
      const nextGrid = grid.map((row) => [...row]);
      nextGrid[r][c] = tileType;
      setGrid(nextGrid);
      const nextMarks = marks.map((row) => [...row]);
      nextMarks[r][c] = false;
      setMarks(nextMarks);
    } else if (action === 'mark_empty') {
      const nextGrid = grid.map((row) => [...row]);
      nextGrid[r][c] = 'empty';
      setGrid(nextGrid);
      const nextMarks = marks.map((row) => [...row]);
      nextMarks[r][c] = true;
      setMarks(nextMarks);
    }
    setActiveHint(null);
  };

  /**
   * Toggles or sets a per-building exclusion mark on (r, c), automatically
   * upgrading to global Grass if all active placeable types in the level are ruled out.
   */
  const toggleBuildingExclusionOnCell = (
    r: number,
    c: number,
    targetType: PlaceableType,
    forceValue?: boolean,
    skipHistory?: boolean
  ) => {
    if (!skipHistory) pushHistory();

    const nextExcluded = cloneExcludedGrid(excludedByCell);
    const nextMarks = marks.map((row) => [...row]);
    const cellSet = nextExcluded[r][c];

    // If cell was globally marked empty (Grass), populate cellSet with all active types first
    if (nextMarks[r][c]) {
      for (const p of activeLevelPlaceables) {
        cellSet.add(p);
      }
    }

    const shouldExclude =
      forceValue !== undefined ? forceValue : !cellSet.has(targetType);

    if (shouldExclude) {
      cellSet.add(targetType);
    } else {
      cellSet.delete(targetType);
    }

    // Check if ALL active placeables in this level are now ruled out on (r, c)
    const allExcluded = activeLevelPlaceables.every((p) => cellSet.has(p));
    nextMarks[r][c] = allExcluded;

    setExcludedByCell(nextExcluded);
    setMarks(nextMarks);
  };

  const handleCellAction = (
    r: number,
    c: number,
    isDragContinue = false,
    dragTargetValue?: boolean
  ) => {
    const currentTile = grid[r][c];
    if (isFixedObstacle(currentTile)) return;

    setSelectedCell({ r, c });
    setActiveHint(null);

    // 1. Global "Mark Empty (Grass)" tool selected
    if (activeTool === 'mark_empty') {
      if (!isDragContinue) pushHistory();
      if (currentTile !== 'empty') {
        if (!isDragContinue) {
          const nextGrid = grid.map((row) => [...row]);
          nextGrid[r][c] = 'empty';
          setGrid(nextGrid);
          playMarkEmptySound();
        }
      } else {
        const targetVal =
          dragTargetValue !== undefined ? dragTargetValue : !marks[r][c];
        const nextMarks = marks.map((row) => [...row]);
        const nextExcluded = cloneExcludedGrid(excludedByCell);
        nextMarks[r][c] = targetVal;
        if (targetVal) {
          for (const p of activeLevelPlaceables) {
            nextExcluded[r][c].add(p);
          }
        } else {
          nextExcluded[r][c].clear();
        }
        setMarks(nextMarks);
        setExcludedByCell(nextExcluded);
        playMarkEmptySound();
      }
      return;
    }

    // 2. Per-Building "Rule Out (🚫)" Mode active
    if (actionMode === 'rule_out') {
      if (currentTile === activeTool && !isDragContinue) {
        // Tapping a placed building of the same type removes it
        pushHistory();
        const nextGrid = grid.map((row) => [...row]);
        nextGrid[r][c] = 'empty';
        setGrid(nextGrid);
        playMarkEmptySound();
        return;
      }
      if (currentTile === 'empty') {
        toggleBuildingExclusionOnCell(
          r,
          c,
          activeTool,
          dragTargetValue,
          isDragContinue
        );
        playMarkEmptySound();
      }
      return;
    }

    // 3. Normal "Build (🔨)" Mode active
    if (isDragContinue) return;

    // Protect squares marked as Empty Grass or ruled out for this specific building from accidental taps!
    if (
      currentTile === 'empty' &&
      (marks[r][c] || excludedByCell[r][c].has(activeTool))
    ) {
      // Unmark on tap instead of accidentally placing a building onto a ruled-out square
      toggleBuildingExclusionOnCell(r, c, activeTool, false, false);
      playMarkEmptySound();
      return;
    }

    pushHistory();
    const nextGrid = grid.map((row) => [...row]);

    if (currentTile === activeTool) {
      nextGrid[r][c] = 'empty';
      playMarkEmptySound();
    } else {
      nextGrid[r][c] = activeTool;
      if (activeTool === 'road') {
        playPlaceRoadSound();
      } else {
        playPlaceBuildingSound();
      }
      setJustPlacedCell({ r, c });
      setTimeout(() => setJustPlacedCell(null), 400);

      const newVal = validateBoard(nextGrid, level);
      if (newVal.cellErrors[`${r},${c}`]) {
        setMistakesMade((m) => m + 1);
        playErrorSound();
      }
    }

    setGrid(nextGrid);
  };

  const handleCellRightClick = (
    r: number,
    c: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    const currentTile = grid[r][c];
    if (isFixedObstacle(currentTile)) return;

    setSelectedCell({ r, c });
    setActiveHint(null);

    if (currentTile !== 'empty') {
      pushHistory();
      const nextGrid = grid.map((row) => [...row]);
      nextGrid[r][c] = 'empty';
      setGrid(nextGrid);
      playMarkEmptySound();
      return;
    }

    if (activeTool === 'mark_empty') {
      pushHistory();
      const nextMarks = marks.map((row) => [...row]);
      nextMarks[r][c] = !nextMarks[r][c];
      setMarks(nextMarks);
      playMarkEmptySound();
    } else {
      toggleBuildingExclusionOnCell(r, c, activeTool);
      playMarkEmptySound();
    }
  };

  const handleLineClueClick = (axis: 'row' | 'col', index: number) => {
    playLineClueRippleSound(level.size);
    setAnimatingLine({ axis, index });
    setTimeout(() => setAnimatingLine(null), 500);

    pushHistory();
    const nextMarks = marks.map((row) => [...row]);
    const nextExcluded = cloneExcludedGrid(excludedByCell);
    let changed = false;

    const coords: Coord[] =
      axis === 'row'
        ? Array.from({ length: level.size }, (_, c) => ({ r: index, c }))
        : Array.from({ length: level.size }, (_, r) => ({ r, c: index }));

    // If user is in per-building Rule-Out mode, toggle that building's exclusion across the whole row/col!
    if (activeTool !== 'mark_empty' && actionMode === 'rule_out') {
      const emptyCoords = coords.filter((pt) => grid[pt.r][pt.c] === 'empty');
      const allHaveExcluded = emptyCoords.every((pt) =>
        nextExcluded[pt.r][pt.c].has(activeTool)
      );
      for (const pt of emptyCoords) {
        if (allHaveExcluded) {
          nextExcluded[pt.r][pt.c].delete(activeTool);
        } else {
          nextExcluded[pt.r][pt.c].add(activeTool);
        }
        nextMarks[pt.r][pt.c] = activeLevelPlaceables.every((p) =>
          nextExcluded[pt.r][pt.c].has(p)
        );
        changed = true;
      }
    } else {
      const allMarked = coords.every(
        (pt) => grid[pt.r][pt.c] !== 'empty' || nextMarks[pt.r][pt.c]
      );
      for (const pt of coords) {
        if (grid[pt.r][pt.c] === 'empty') {
          nextMarks[pt.r][pt.c] = !allMarked;
          if (!allMarked) {
            for (const p of activeLevelPlaceables) {
              nextExcluded[pt.r][pt.c].add(p);
            }
          } else {
            nextExcluded[pt.r][pt.c].clear();
          }
          changed = true;
        }
      }
    }

    if (changed) {
      setMarks(nextMarks);
      setExcludedByCell(nextExcluded);
    }
  };

  const liveStars =
    hintsUsed === 0 && mistakesMade === 0 ? 3 : hintsUsed <= 1 ? 2 : 1;

  const selectedErrors = selectedCell
    ? validation.cellErrors[`${selectedCell.r},${selectedCell.c}`]
    : undefined;
  const anyErrorList = Object.values(validation.cellErrors).flat();
  const topErrorMessage =
    selectedErrors?.[0] ?? anyErrorList[0] ?? null;

  const hasNextCampaignLevel = level.id < CAMPAIGN_CONFIGS.length;

  return (
    <div className="app-shell">
      <HeaderBar
        level={level}
        currentStars={
          savedProgress.starsByLevel[level.id] ?? liveStars
        }
        canUndo={history.length > 0}
        isMuted={isMuted}
        onUndo={handleUndo}
        onReset={handleReset}
        onHint={handleHint}
        onOpenRules={() => setShowRulesModal(true)}
        onOpenLevels={() => setShowLevelsModal(true)}
        onToggleSound={handleToggleSound}
      />

      {/* Contextual Banner Area */}
      <div className="context-banner-slot">
        {activeHint ? (
          <div className="banner-pill banner-hint">
            <Lightbulb size={18} className="banner-icon" />
            <div className="banner-content">
              <strong>{activeHint.ruleName}:</strong> {activeHint.explanation}
            </div>
            <button
              type="button"
              className="banner-action-btn"
              onClick={applyHintMove}
            >
              Apply
            </button>
          </div>
        ) : topErrorMessage ? (
          <div className="banner-pill banner-error">
            <AlertTriangle size={18} className="banner-icon" />
            <div className="banner-content">{topErrorMessage}</div>
          </div>
        ) : level.tutorialTip && !dismissedTip ? (
          <div className="banner-pill banner-tip">
            <Info size={18} className="banner-icon" />
            <div className="banner-content">{level.tutorialTip}</div>
            <button
              type="button"
              className="banner-dismiss-btn"
              onClick={() => setDismissedTip(true)}
            >
              Got it
            </button>
          </div>
        ) : null}
      </div>

      {/* Main Puzzle Board */}
      <main className="main-stage">
        <GameBoard
          level={level}
          grid={grid}
          marks={marks}
          excludedByCell={excludedByCell}
          activeTool={activeTool}
          actionMode={actionMode}
          validation={validation}
          activeHint={activeHint}
          selectedCell={selectedCell}
          justPlacedCell={justPlacedCell}
          animatingLine={animatingLine}
          onCellAction={handleCellAction}
          onCellRightClick={handleCellRightClick}
          onLineClueClick={handleLineClueClick}
        />
      </main>

      {/* Bottom Wooden Building Tray with Mobile Touch Mode Switch */}
      <BuildingTray
        level={level}
        remainingInventory={validation.remainingInventory}
        activeTool={activeTool}
        actionMode={actionMode}
        onSelectTool={(tool) => {
          setActiveTool(tool);
          if (tool === 'mark_empty') {
            setActionMode('build');
          }
        }}
        onToggleActionMode={setActionMode}
      />

      {/* Victory Overlay */}
      {validation.isSolved && (
        <div className="victory-backdrop">
          <div className="victory-card">
            <div className="victory-badge-icon">
              <CheckCircle2 size={42} />
            </div>
            <h2>Village Complete!</h2>
            <p className="victory-subtitle">
              Level {level.id}: {level.title}
            </p>
            <div className="victory-stars">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  size={34}
                  className={
                    s <= liveStars ? 'star-icon filled' : 'star-icon empty'
                  }
                />
              ))}
            </div>
            <p className="victory-note">
              {liveStars === 3
                ? 'Flawless logical deduction!'
                : 'Every building and road is connected in harmony.'}
            </p>
            <div className="victory-actions">
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => setShowLevelsModal(true)}
              >
                All Levels
              </button>
              {hasNextCampaignLevel ? (
                <button
                  type="button"
                  className="action-pill-btn primary"
                  onClick={() => handleSelectCampaignLevel(level.id + 1)}
                >
                  Next Level <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className="action-pill-btn primary"
                  onClick={() => handleGenerateBonus(6)}
                >
                  <Sparkles size={18} /> New Bonus Charter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showRulesModal && (
        <RulesModal onClose={() => setShowRulesModal(false)} />
      )}

      {showLevelsModal && (
        <LevelSelectModal
          currentLevelId={level.id}
          starsByLevel={savedProgress.starsByLevel}
          onSelectLevel={handleSelectCampaignLevel}
          onGenerateBonus={handleGenerateBonus}
          onClose={() => setShowLevelsModal(false)}
        />
      )}
    </div>
  );
};
