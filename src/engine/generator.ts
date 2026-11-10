import { countSolutions, solveByDeduction } from './solver';
import {
  BuildingType,
  Coord,
  DifficultyMetrics,
  isBuilding,
  isFixedObstacle,
  LevelDefinition,
  PlaceableType,
  TileType
} from './types';
import {
  getOrthoNeighbors,
  getSurrounding8Neighbors,
  isRoadTileOnValidPath,
  validateBoard
} from './validator';

export interface GeneratorConfig {
  id: number;
  chapter: number;
  chapterName: string;
  title: string;
  size: number;
  buildings: {
    town_hall: number;
    woodcutter: number;
    farm: number;
    house: number;
  };
  extraTrees?: number;
  rocks?: number;
  minDensity?: number;
  allowTurningRoads?: boolean;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  tutorialTip?: string;
}

export function calculateDifficultyMetrics(
  level: LevelDefinition
): DifficultyMetrics {
  const trace = solveByDeduction(level);
  const stepCount = trace.steps.length;
  const hasContradiction = trace.steps.some(
    (s) => s.ruleName === 'Logical Elimination'
  );

  let maxRuleLevel = 1;
  let maxRuleName = 'Line Clue Complete';

  for (const step of trace.steps) {
    if (step.ruleName === 'Logical Elimination') {
      if (maxRuleLevel < 5) {
        maxRuleLevel = 5;
        maxRuleName = step.ruleName;
      }
    } else if (
      step.ruleName.includes('Must Be Road') ||
      step.ruleName === 'Road Entry Point'
    ) {
      if (maxRuleLevel < 4) {
        maxRuleLevel = 4;
        maxRuleName = step.ruleName;
      }
    } else if (
      step.ruleName.includes('Must Be Filled') ||
      step.ruleName === 'Only Remaining Spot'
    ) {
      if (maxRuleLevel < 3) {
        maxRuleLevel = 3;
        maxRuleName = step.ruleName;
      }
    } else if (
      step.ruleName.includes('Needs') ||
      step.ruleName.includes('Orthogonal') ||
      step.ruleName.startsWith('Only ')
    ) {
      if (maxRuleLevel < 2) {
        maxRuleLevel = 2;
        maxRuleName = step.ruleName;
      }
    }
  }

  const filledTiles = level.solution
    .flat()
    .filter((t) => t !== 'empty').length;
  const totalTiles = level.size * level.size;
  const density = Math.round((filledTiles / totalTiles) * 100) / 100;

  const hasRoads = (level.inventory.town_hall ?? 0) > 0 || (level.inventory.road ?? 0) > 0;

  let rawScore = 20;
  if (level.size === 4) {
    rawScore = 15 + Math.round(stepCount * 0.9) + Math.round((density - 0.35) * 15);
  } else if (level.size === 5) {
    const base = hasRoads ? 52 : 36;
    rawScore =
      base +
      Math.round(Math.max(0, stepCount - 12) * 0.9) +
      Math.round(Math.max(0, density - 0.40) * 20) +
      (hasContradiction ? 8 : 0);
  } else {
    // 6x6
    rawScore =
      70 +
      Math.round(Math.max(0, stepCount - 20) * 0.8) +
      Math.round(Math.max(0, density - 0.50) * 25) +
      (hasContradiction ? 10 : 0);
  }

  const score = Math.min(99, Math.max(15, Math.round(rawScore)));

  const tier: 'Easy' | 'Medium' | 'Hard' | 'Expert' =
    score <= 35 ? 'Easy' : score <= 58 ? 'Medium' : score <= 78 ? 'Hard' : 'Expert';

  return {
    score,
    tier,
    maxRuleLevel,
    maxRuleName,
    stepCount,
    density,
    filledTiles
  };
}

export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isInTownHallPerimeter(
  th: Coord | null,
  r: number,
  c: number
): boolean {
  if (!th) return false;
  return Math.abs(th.r - r) <= 1 && Math.abs(th.c - c) <= 1;
}

function canPlaceBuildingOnConstructGrid(
  grid: TileType[][],
  th: Coord | null,
  r: number,
  c: number,
  bType: BuildingType
): boolean {
  const size = grid.length;
  if (grid[r][c] !== 'empty') return false;
  if (bType !== 'town_hall' && isInTownHallPerimeter(th, r, c)) return false;

  for (let i = 0; i < size; i++) {
    if (grid[r][i] === bType) return false;
    if (grid[i][c] === bType) return false;
  }

  for (const n of getSurrounding8Neighbors(size, r, c)) {
    const nt = grid[n.r][n.c];
    if (nt === bType) return false;
    if (bType === 'town_hall' && (isBuilding(nt) || isFixedObstacle(nt))) {
      return false;
    }
  }

  return true;
}

function findRoadPathToTownHall(
  grid: TileType[][],
  sr: number,
  sc: number,
  th: Coord,
  rng: () => number
): Coord[] | null {
  const size = grid.length;
  const dist = Array.from({ length: size }, () => Array(size).fill(Infinity));
  const parent: (Coord | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );
  const deque: Coord[] = [];

  for (const n of shuffle(getOrthoNeighbors(size, sr, sc), rng)) {
    if (grid[n.r][n.c] === 'empty' || grid[n.r][n.c] === 'road') {
      const cost = grid[n.r][n.c] === 'road' ? 0 : 1;
      dist[n.r][n.c] = cost;
      if (cost === 0) deque.unshift(n);
      else deque.push(n);
    }
  }

  let endRoadCell: Coord | null = null;

  while (deque.length > 0) {
    const curr = deque.shift()!;
    const d = dist[curr.r][curr.c];

    const ortho = shuffle(getOrthoNeighbors(size, curr.r, curr.c), rng);
    if (ortho.some((n) => n.r === th.r && n.c === th.c)) {
      endRoadCell = curr;
      break;
    }

    for (const n of ortho) {
      if (grid[n.r][n.c] === 'empty' || grid[n.r][n.c] === 'road') {
        const w = grid[n.r][n.c] === 'road' ? 0 : 1;
        if (d + w < dist[n.r][n.c]) {
          dist[n.r][n.c] = d + w;
          parent[n.r][n.c] = curr;
          if (w === 0) deque.unshift(n);
          else deque.push(n);
        }
      }
    }
  }

  if (!endRoadCell) return null;

  const path: Coord[] = [];
  let ptr: Coord | null = endRoadCell;
  while (ptr) {
    path.push(ptr);
    ptr = parent[ptr.r][ptr.c];
  }
  return path;
}

function buildLevelFromSolution(
  solution: TileType[][],
  config: GeneratorConfig
): LevelDefinition {
  const size = config.size;
  const initialGrid: TileType[][] = solution.map((row) =>
    row.map((cell) => (cell === 'tree' || cell === 'rock' ? cell : 'empty'))
  );

  const rowClues = Array(size).fill(0);
  const colClues = Array(size).fill(0);
  const inventory: Record<PlaceableType, number> = {
    house: 0,
    woodcutter: 0,
    road: 0,
    farm: 0,
    town_hall: 0
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = solution[r][c];
      if (
        t === 'house' ||
        t === 'woodcutter' ||
        t === 'road' ||
        t === 'farm' ||
        t === 'town_hall'
      ) {
        inventory[t]++;
      }
      if (isBuilding(t)) {
        rowClues[r]++;
        colClues[c]++;
      }
    }
  }

  return {
    id: config.id,
    chapter: config.chapter,
    chapterName: config.chapterName,
    title: config.title,
    size,
    initialGrid,
    rowClues,
    colClues,
    inventory,
    solution: solution.map((r) => [...r]),
    difficulty: config.difficulty ?? 'Medium',
    tutorialTip: config.tutorialTip
  };
}

export function generateVerifiedLevel(
  config: GeneratorConfig,
  baseSeed: number,
  maxAttempts = 2500
): LevelDefinition {
  const rng = createRng(baseSeed);
  const size = config.size;

  const allCoords: Coord[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      allCoords.push({ r, c });
    }
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid: TileType[][] = Array.from({ length: size }, () =>
      Array(size).fill('empty')
    );

    let thCoord: Coord | null = null;

    if (config.buildings.town_hall > 0) {
      const candidates = shuffle(allCoords, rng);
      thCoord = candidates[0];
      grid[thCoord.r][thCoord.c] = 'town_hall';
    }

    const woodcutters: Coord[] = [];
    let ok = true;
    for (let i = 0; i < config.buildings.woodcutter; i++) {
      const candidates = shuffle(allCoords, rng).filter((c) =>
        canPlaceBuildingOnConstructGrid(grid, thCoord, c.r, c.c, 'woodcutter')
      );

      let placed = false;
      for (const cand of candidates) {
        const ortho = shuffle(getOrthoNeighbors(size, cand.r, cand.c), rng);
        const hasExistingTree = ortho.some((n) => grid[n.r][n.c] === 'tree');
        const treeSpot = ortho.find(
          (n) =>
            grid[n.r][n.c] === 'empty' &&
            !isInTownHallPerimeter(thCoord, n.r, n.c)
        );

        if (hasExistingTree || treeSpot) {
          grid[cand.r][cand.c] = 'woodcutter';
          if (!hasExistingTree && treeSpot) {
            grid[treeSpot.r][treeSpot.c] = 'tree';
          }
          woodcutters.push(cand);
          placed = true;
          break;
        }
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // 3. Every Woodcutter must have an adjacent House (and no two Woodcutters can share a House!)
    let housesPlaced = 0;
    for (const wc of woodcutters) {
      const ortho = shuffle(getOrthoNeighbors(size, wc.r, wc.c), rng);
      const alreadyHasHouse = ortho.some((n) => grid[n.r][n.c] === 'house');
      if (alreadyHasHouse) continue;

      if (housesPlaced >= config.buildings.house) {
        ok = false;
        break;
      }

      const houseSpot = ortho.find((n) =>
        canPlaceBuildingOnConstructGrid(grid, thCoord, n.r, n.c, 'house')
      );
      if (!houseSpot) {
        ok = false;
        break;
      }
      grid[houseSpot.r][houseSpot.c] = 'house';
      housesPlaced++;
    }
    if (!ok) continue;

    // 4. Place Farms (each Farm must have an adjacent House — either sharing an existing House or getting a new one)
    const farms: Coord[] = [];
    for (let i = 0; i < config.buildings.farm; i++) {
      const remainingNewHouses =
        config.buildings.house -
        housesPlaced -
        (config.buildings.farm - 1 - i);

      const candidates = shuffle(allCoords, rng).filter((c) =>
        canPlaceBuildingOnConstructGrid(grid, thCoord, c.r, c.c, 'farm')
      );

      let placedFarm = false;
      for (const cand of candidates) {
        const ortho = shuffle(getOrthoNeighbors(size, cand.r, cand.c), rng);
        const touchesExistingHouse = ortho.some(
          (n) => grid[n.r][n.c] === 'house'
        );

        if (touchesExistingHouse && remainingNewHouses <= 0) {
          grid[cand.r][cand.c] = 'farm';
          farms.push(cand);
          placedFarm = true;
          break;
        }

        if (housesPlaced < config.buildings.house) {
          const newHouseSpot = ortho.find((n) =>
            canPlaceBuildingOnConstructGrid(grid, thCoord, n.r, n.c, 'house')
          );
          if (newHouseSpot) {
            grid[cand.r][cand.c] = 'farm';
            grid[newHouseSpot.r][newHouseSpot.c] = 'house';
            housesPlaced++;
            farms.push(cand);
            placedFarm = true;
            break;
          }
        }

        if (touchesExistingHouse) {
          grid[cand.r][cand.c] = 'farm';
          farms.push(cand);
          placedFarm = true;
          break;
        }
      }

      if (!placedFarm) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // Place any remaining Houses adjacent to Woodcutters or Farms
    while (housesPlaced < config.buildings.house) {
      const partners = shuffle([...woodcutters, ...farms], rng);
      let placedOne = false;
      for (const p of partners) {
        const ortho = shuffle(getOrthoNeighbors(size, p.r, p.c), rng);
        const spot = ortho.find((n) =>
          canPlaceBuildingOnConstructGrid(grid, thCoord, n.r, n.c, 'house')
        );
        if (spot) {
          grid[spot.r][spot.c] = 'house';
          housesPlaced++;
          placedOne = true;
          break;
        }
      }
      if (!placedOne) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    if (thCoord) {
      const needRoads = shuffle([...woodcutters, ...farms], rng);
      const maxAllowedRoads = size >= 6 ? 8 : 6;
      for (const b of needRoads) {
        const path = findRoadPathToTownHall(grid, b.r, b.c, thCoord, rng);
        if (!path || path.length === 0 || path.length > maxAllowedRoads) {
          ok = false;
          break;
        }
        for (const p of path) {
          grid[p.r][p.c] = 'road';
        }
      }
      if (!ok) continue;

      let totalRoads = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === 'road') {
            totalRoads++;
            if (!isRoadTileOnValidPath(grid, r, c)) {
              ok = false;
              break;
            }
          }
        }
      }
      if (!ok || totalRoads > maxAllowedRoads) continue;

      if (config.allowTurningRoads) {
        let hasTurn = false;
        for (const b of [...woodcutters, ...farms]) {
          if (b.r !== thCoord.r && b.c !== thCoord.c) {
            hasTurn = true;
            break;
          }
        }
        if (!hasTurn) continue;
      }
    }

    // Every extra Tree must ALSO be orthogonally adjacent to a Woodcutter!
    const extraTrees = config.extraTrees ?? 0;
    for (let i = 0; i < extraTrees; i++) {
      const wcAdjSpots: Coord[] = [];
      for (const wc of woodcutters) {
        for (const n of getOrthoNeighbors(size, wc.r, wc.c)) {
          if (
            grid[n.r][n.c] === 'empty' &&
            !isInTownHallPerimeter(thCoord, n.r, n.c)
          ) {
            wcAdjSpots.push(n);
          }
        }
      }
      const spot = shuffle(wcAdjSpots, rng)[0];
      if (spot) grid[spot.r][spot.c] = 'tree';
    }

    const rocks = config.rocks ?? 0;
    for (let i = 0; i < rocks; i++) {
      const spot = shuffle(allCoords, rng).find(
        (c) =>
          grid[c.r][c.c] === 'empty' &&
          !isInTownHallPerimeter(thCoord, c.r, c.c)
      );
      if (spot) grid[spot.r][spot.c] = 'rock';
    }

    const filledCount = grid.flat().filter((t) => t !== 'empty').length;
    const currentDensity = filledCount / (size * size);

    const defaultMinDensity =
      config.minDensity ?? (size === 4 ? 0.44 : size === 5 ? 0.48 : 0.50);
    let effectiveMinDensity = defaultMinDensity;
    if (attempt > maxAttempts * 0.85) {
      effectiveMinDensity = Math.max(0.28, defaultMinDensity - 0.20);
    } else if (attempt > maxAttempts * 0.65) {
      effectiveMinDensity = Math.max(0.32, defaultMinDensity - 0.14);
    } else if (attempt > maxAttempts * 0.40) {
      effectiveMinDensity = Math.max(0.38, defaultMinDensity - 0.08);
    }

    if (currentDensity < effectiveMinDensity) continue;

    let candidateLevel = buildLevelFromSolution(grid, config);
    if (!validateBoard(grid, candidateLevel).isSolved) continue;

    let solCheck = countSolutions(candidateLevel, 2);

    // Up to 3 symmetry-breaking rock placements if alternate solutions exist
    for (let symStep = 0; symStep < 3 && solCheck.count > 1; symStep++) {
      const alt = solCheck.solutions.find((s) =>
        s.some((row, r) => row.some((cell, c) => cell !== grid[r][c]))
      );
      if (!alt) break;
      const diffEmptySpots: Coord[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (
            grid[r][c] === 'empty' &&
            alt[r][c] !== 'empty' &&
            !isInTownHallPerimeter(thCoord, r, c)
          ) {
            diffEmptySpots.push({ r, c });
          }
        }
      }
      if (diffEmptySpots.length === 0) break;
      const blocker = diffEmptySpots[0];
      grid[blocker.r][blocker.c] = 'rock';
      candidateLevel = buildLevelFromSolution(grid, config);
      solCheck = countSolutions(candidateLevel, 2);
    }

    if (solCheck.count !== 1) continue;

    const deduction = solveByDeduction(candidateLevel);
    if (!deduction.solved) continue;

    const metrics = calculateDifficultyMetrics(candidateLevel);
    candidateLevel.difficultyMetrics = metrics;
    candidateLevel.difficultyScore = metrics.score;
    candidateLevel.difficulty = config.difficulty ?? metrics.tier;
    candidateLevel.density = metrics.density;

    return candidateLevel;
  }

  throw new Error(
    `Failed to generate verified level for config "${config.title}" (id=${config.id}) after ${maxAttempts} attempts.`
  );
}
