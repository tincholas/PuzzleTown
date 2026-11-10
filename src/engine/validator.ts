import {
  BoardValidationResult,
  BuildingType,
  BUILDING_TYPES,
  Coord,
  isBuilding,
  isFixedObstacle,
  isPlaceable,
  LevelDefinition,
  LineStatus,
  PlaceableType,
  PLACEABLE_TYPES,
  TileType
} from './types';

const ORTHO_DIRS: Coord[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 }
];

const ALL_8_DIRS: Coord[] = [
  { r: -1, c: -1 },
  { r: -1, c: 0 },
  { r: -1, c: 1 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
  { r: 1, c: -1 },
  { r: 1, c: 0 },
  { r: 1, c: 1 }
];

export function inBounds(size: number, r: number, c: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

export function getOrthoNeighbors(size: number, r: number, c: number): Coord[] {
  const res: Coord[] = [];
  for (const d of ORTHO_DIRS) {
    const nr = r + d.r;
    const nc = c + d.c;
    if (inBounds(size, nr, nc)) {
      res.push({ r: nr, c: nc });
    }
  }
  return res;
}

export function getSurrounding8Neighbors(
  size: number,
  r: number,
  c: number
): Coord[] {
  const res: Coord[] = [];
  for (const d of ALL_8_DIRS) {
    const nr = r + d.r;
    const nc = c + d.c;
    if (inBounds(size, nr, nc)) {
      res.push({ r: nr, c: nc });
    }
  }
  return res;
}

/**
 * Checks whether a building at (startR, startC) is connected to a Town Hall
 * via a continuous orthogonal chain of at least 1 'road' tile.
 */
export function hasRoadPathToTownHall(
  grid: TileType[][],
  startR: number,
  startC: number
): boolean {
  const size = grid.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: Coord[] = [];

  // Must start by stepping onto an orthogonally adjacent 'road' tile
  for (const n of getOrthoNeighbors(size, startR, startC)) {
    if (grid[n.r][n.c] === 'road') {
      visited[n.r][n.c] = true;
      queue.push(n);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const n of getOrthoNeighbors(size, curr.r, curr.c)) {
      const tile = grid[n.r][n.c];
      if (tile === 'town_hall') {
        return true;
      }
      if (tile === 'road' && !visited[n.r][n.c]) {
        visited[n.r][n.c] = true;
        queue.push(n);
      }
    }
  }

  return false;
}

/**
 * Checks if a specific road tile at (roadR, roadC) lies on a simple (non-self-intersecting)
 * orthogonal road path between a Town Hall and a Woodcutter or Farm.
 */
export function isRoadTileOnValidPath(
  grid: TileType[][],
  roadR: number,
  roadC: number
): boolean {
  const size = grid.length;
  if (grid[roadR][roadC] !== 'road') return false;

  // Find all road cells reachable from Town Hall, and verify a simple path through (roadR, roadC)
  // reaches a Woodcutter or Farm. Since grids are small (4x4 to 7x7), DFS for a simple path is tiny.
  const townHalls: Coord[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 'town_hall') {
        townHalls.push({ r, c });
      }
    }
  }
  if (townHalls.length === 0) return false;

  // Check if there is a simple path of road tiles starting adjacent to a town_hall,
  // passing through (roadR, roadC), and ending adjacent to a woodcutter or farm.
  const visited = Array.from({ length: size }, () => Array(size).fill(false));

  function dfs(r: number, c: number, passedTargetRoad: boolean): boolean {
    const nowPassed = passedTargetRoad || (r === roadR && c === roadC);
    if (nowPassed) {
      // Check if adjacent to woodcutter or farm
      for (const n of getOrthoNeighbors(size, r, c)) {
        if (grid[n.r][n.c] === 'woodcutter' || grid[n.r][n.c] === 'farm') {
          return true;
        }
      }
    }

    for (const n of getOrthoNeighbors(size, r, c)) {
      if (grid[n.r][n.c] === 'road' && !visited[n.r][n.c]) {
        visited[n.r][n.c] = true;
        if (dfs(n.r, n.c, nowPassed)) return true;
        visited[n.r][n.c] = false;
      }
    }
    return false;
  }

  for (const th of townHalls) {
    for (const startRoad of getOrthoNeighbors(size, th.r, th.c)) {
      if (grid[startRoad.r][startRoad.c] === 'road') {
        visited[startRoad.r][startRoad.c] = true;
        if (dfs(startRoad.r, startRoad.c, false)) {
          return true;
        }
        visited[startRoad.r][startRoad.c] = false;
      }
    }
  }

  return false;
}

export function validateBoard(
  grid: TileType[][],
  level: LevelDefinition
): BoardValidationResult {
  const size = level.size;
  const cellErrors: Record<string, string[]> = {};
  const cellSatisfied: Record<string, boolean> = {};

  const addError = (r: number, c: number, msg: string) => {
    const key = `${r},${c}`;
    if (!cellErrors[key]) cellErrors[key] = [];
    if (!cellErrors[key].includes(msg)) {
      cellErrors[key].push(msg);
    }
  };

  // 1. Compute remaining inventory
  const placedCounts: Record<PlaceableType, number> = {
    house: 0,
    woodcutter: 0,
    road: 0,
    farm: 0,
    town_hall: 0
  };

  const rowCounts = Array(size).fill(0);
  const colCounts = Array(size).fill(0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = grid[r][c];
      if (isPlaceable(t)) {
        placedCounts[t]++;
      }
      if (isBuilding(t)) {
        rowCounts[r]++;
        colCounts[c]++;
      }
    }
  }

  const remainingInventory: Record<PlaceableType, number> = {
    house: level.inventory.house - placedCounts.house,
    woodcutter: level.inventory.woodcutter - placedCounts.woodcutter,
    road: level.inventory.road - placedCounts.road,
    farm: level.inventory.farm - placedCounts.farm,
    town_hall: level.inventory.town_hall - placedCounts.town_hall
  };

  // 2. Row and Column statuses
  const rowStatus: LineStatus[] = rowCounts.map((count, r) =>
    count < level.rowClues[r]
      ? 'under'
      : count === level.rowClues[r]
      ? 'exact'
      : 'over'
  );
  const colStatus: LineStatus[] = colCounts.map((count, c) =>
    count < level.colClues[c]
      ? 'under'
      : count === level.colClues[c]
      ? 'exact'
      : 'over'
  );

  // 3. Check general building rules:
  // - Max 1 of the same building type per row and column
  for (let r = 0; r < size; r++) {
    const byType: Partial<Record<BuildingType, number[]>> = {};
    for (let c = 0; c < size; c++) {
      const t = grid[r][c];
      if (isBuilding(t)) {
        if (!byType[t]) byType[t] = [];
        byType[t]!.push(c);
      }
    }
    for (const bType of BUILDING_TYPES) {
      const cols = byType[bType];
      if (cols && cols.length > 1) {
        for (const c of cols) {
          addError(r, c, `Row ${r + 1} has more than one ${formatTileName(bType)}.`);
        }
      }
    }
  }

  for (let c = 0; c < size; c++) {
    const byType: Partial<Record<BuildingType, number[]>> = {};
    for (let r = 0; r < size; r++) {
      const t = grid[r][c];
      if (isBuilding(t)) {
        if (!byType[t]) byType[t] = [];
        byType[t]!.push(r);
      }
    }
    for (const bType of BUILDING_TYPES) {
      const rows = byType[bType];
      if (rows && rows.length > 1) {
        for (const r of rows) {
          addError(r, c, `Column ${c + 1} has more than one ${formatTileName(bType)}.`);
        }
      }
    }
  }

  const levelHasTownHall = level.inventory.town_hall > 0;
  const allPlaceablesPlaced = PLACEABLE_TYPES.every(
    (t) => remainingInventory[t] === 0
  );

  // 4. Per-cell rules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = grid[r][c];
      const key = `${r},${c}`;

      const ortho = getOrthoNeighbors(size, r, c);
      const surr8 = getSurrounding8Neighbors(size, r, c);

      // Every Tree must have an orthogonally adjacent Woodcutter
      if (t === 'tree') {
        const hasWoodcutter = ortho.some(
          (n) => grid[n.r][n.c] === 'woodcutter'
        );
        if (allPlaceablesPlaced && !hasWoodcutter) {
          addError(
            r,
            c,
            'Every Tree must have a Woodcutter orthogonally next to it.'
          );
        }
        cellSatisfied[key] = hasWoodcutter && !cellErrors[key];
        continue;
      }

      if (!isPlaceable(t)) continue;

      if (isBuilding(t)) {
        // Cannot have another of the SAME building type in any of the 8 surrounding squares
        for (const n of surr8) {
          if (grid[n.r][n.c] === t) {
            addError(
              r,
              c,
              `Cannot touch another ${formatTileName(t)} (even diagonally).`
            );
          }
        }
      }

      if (t === 'town_hall') {
        // Cannot have any building or tree/rock in 8 surrounding squares
        let clearPerimeter = true;
        for (const n of surr8) {
          const nt = grid[n.r][n.c];
          if (isBuilding(nt) || isFixedObstacle(nt)) {
            clearPerimeter = false;
            addError(
              r,
              c,
              `Town Hall cannot have ${formatTileName(nt)} in its surrounding 8 squares.`
            );
            if (isBuilding(nt)) {
              addError(
                n.r,
                n.c,
                `Cannot be placed in the 8 squares surrounding the Town Hall.`
              );
            }
          }
        }
        cellSatisfied[key] = clearPerimeter && !cellErrors[key];
      } else if (t === 'woodcutter') {
        const hasTree = ortho.some((n) => grid[n.r][n.c] === 'tree');
        const hasHouse = ortho.some((n) => grid[n.r][n.c] === 'house');
        if (!hasTree) {
          addError(r, c, 'Woodcutter must be orthogonally next to a Tree.');
        }
        if (allPlaceablesPlaced && !hasHouse) {
          addError(r, c, 'Woodcutter must be orthogonally next to a House.');
        }
        const hasRoadConnection =
          !levelHasTownHall || hasRoadPathToTownHall(grid, r, c);
        if (levelHasTownHall && allPlaceablesPlaced && !hasRoadConnection) {
          addError(
            r,
            c,
            'Woodcutter must connect to the Town Hall via a Road path.'
          );
        }
        cellSatisfied[key] =
          hasTree && hasHouse && hasRoadConnection && !cellErrors[key];
      } else if (t === 'house') {
        const hasPartner = ortho.some(
          (n) => grid[n.r][n.c] === 'woodcutter' || grid[n.r][n.c] === 'farm'
        );
        if (allPlaceablesPlaced && !hasPartner) {
          addError(
            r,
            c,
            'House must be orthogonally next to a Woodcutter or Farm.'
          );
        }
        cellSatisfied[key] = hasPartner && !cellErrors[key];
      } else if (t === 'farm') {
        const hasHouse = ortho.some((n) => grid[n.r][n.c] === 'house');
        const hasRoadConnection =
          !levelHasTownHall || hasRoadPathToTownHall(grid, r, c);
        if (allPlaceablesPlaced && !hasHouse) {
          addError(r, c, 'Farm must be orthogonally next to a House.');
        }
        if (levelHasTownHall && allPlaceablesPlaced && !hasRoadConnection) {
          addError(r, c, 'Farm must connect to the Town Hall via a Road path.');
        }
        cellSatisfied[key] =
          hasHouse && hasRoadConnection && !cellErrors[key];
      } else if (t === 'road') {
        const onValidPath = isRoadTileOnValidPath(grid, r, c);
        if (allPlaceablesPlaced && !onValidPath) {
          addError(
            r,
            c,
            'Road tile must connect a Woodcutter or Farm to the Town Hall.'
          );
        }
        cellSatisfied[key] = onValidPath && !cellErrors[key];
      }
    }
  }

  // Also flag row/col clue overflows on buildings in that row/col
  for (let r = 0; r < size; r++) {
    if (rowStatus[r] === 'over') {
      for (let c = 0; c < size; c++) {
        if (isBuilding(grid[r][c])) {
          addError(
            r,
            c,
            `Row ${r + 1} exceeds its limit of ${level.rowClues[r]} building(s).`
          );
        }
      }
    }
  }

  for (let c = 0; c < size; c++) {
    if (colStatus[c] === 'over') {
      for (let r = 0; r < size; r++) {
        if (isBuilding(grid[r][c])) {
          addError(
            r,
            c,
            `Column ${c + 1} exceeds its limit of ${level.colClues[c]} building(s).`
          );
        }
      }
    }
  }

  const hasAnyError = Object.keys(cellErrors).length > 0;
  const allRowsExact = rowStatus.every((s) => s === 'exact');
  const allColsExact = colStatus.every((s) => s === 'exact');
  const allPlacedSatisfied = Object.values(cellSatisfied).every(Boolean);

  const isSolved =
    allPlaceablesPlaced &&
    allRowsExact &&
    allColsExact &&
    !hasAnyError &&
    allPlacedSatisfied;

  return {
    isComplete: allPlaceablesPlaced,
    isSolved,
    cellErrors,
    cellSatisfied,
    rowStatus,
    colStatus,
    rowCounts,
    colCounts,
    remainingInventory
  };
}

export function formatTileName(tile: TileType): string {
  switch (tile) {
    case 'woodcutter':
      return 'Woodcutter';
    case 'house':
      return 'House';
    case 'farm':
      return 'Farm';
    case 'town_hall':
      return 'Town Hall';
    case 'road':
      return 'Road';
    case 'tree':
      return 'Tree';
    case 'rock':
      return 'Rock';
    default:
      return 'Empty';
  }
}
