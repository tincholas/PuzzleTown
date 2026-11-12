import {
  BuildingType,
  BUILDING_TYPES,
  Coord,
  DeductionHint,
  HintStep,
  isBuilding,
  isFixedObstacle,
  LevelDefinition,
  PlaceableType,
  PLACEABLE_TYPES,
  TileType
} from './types';
import {
  formatTileName,
  getOrthoNeighbors,
  getSurrounding8Neighbors,
  isRoadTileOnValidPath,
  validateBoard
} from './validator';

export interface DeductionResult {
  solved: boolean;
  steps: DeductionHint[];
  finalDomains: Set<TileType>[][];
  lookaheadCount: number;
}

/**
 * Formats grid coordinates (row, col) as human-friendly 1-based (X, Y) = (col + 1, row + 1).
 */
function xy(r: number, c: number): string {
  return `(${c + 1}, ${r + 1})`;
}

function createInitialDomains(
  level: LevelDefinition,
  currentGrid?: TileType[][],
  playerMarks?: boolean[][],
  playerBuildingMarks?: boolean[][]
): Set<TileType>[][] {
  const size = level.size;
  const activePlaceables = PLACEABLE_TYPES.filter(
    (t) => level.inventory[t] > 0
  );

  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const initTile = level.initialGrid[r][c];
      if (isFixedObstacle(initTile)) {
        return new Set<TileType>([initTile]);
      }
      if (currentGrid && currentGrid[r][c] !== 'empty') {
        return new Set<TileType>([currentGrid[r][c]]);
      }
      if (playerBuildingMarks && playerBuildingMarks[r][c]) {
        // Player marked this cell as a generic Building!
        // It cannot be empty grass or road:
        const buildingsOnly = activePlaceables.filter((t) => isBuilding(t));
        return new Set<TileType>(buildingsOnly);
      }
      if (playerMarks && playerMarks[r][c]) {
        // Player marked this cell as clear ground (Grass).
        // No buildings can be placed here! Roads can still pass through if road inventory > 0.
        const nonBuildings: TileType[] = ['empty'];
        if (level.inventory.road > 0) nonBuildings.push('road');
        return new Set<TileType>(nonBuildings);
      }
      return new Set<TileType>(['empty', ...activePlaceables]);
    })
  );
}

function getLockedTile(domain: Set<TileType>): TileType | null {
  if (domain.size === 1) {
    return domain.values().next().value!;
  }
  return null;
}

function canBeAnyBuilding(domain: Set<TileType>): boolean {
  for (const b of BUILDING_TYPES) {
    if (domain.has(b)) return true;
  }
  return false;
}

function mustBeBuilding(domain: Set<TileType>): boolean {
  if (domain.size === 0) return false;
  for (const t of domain) {
    if (!isBuilding(t)) return false;
  }
  return true;
}

function removeBuildingsFromDomain(domain: Set<TileType>): boolean {
  let changed = false;
  for (const b of BUILDING_TYPES) {
    if (domain.delete(b)) changed = true;
  }
  return changed;
}

function canBeRoadEndpointOrRoad(domain: Set<TileType>): boolean {
  return (
    domain.has('road') ||
    domain.has('town_hall') ||
    domain.has('woodcutter') ||
    domain.has('farm')
  );
}

export type EliminationReason =
  | { type: 'PLAYER_MARKED_EMPTY' }
  | { type: 'PLAYER_MARKED_BUILDING' }
  | { type: 'NO_ADJACENT_TREE' }
  | { type: 'NO_ADJACENT_HOUSE'; buildingType: 'woodcutter' | 'farm' }
  | { type: 'NO_ADJACENT_PARTNER'; buildingType: 'house' }
  | {
      type: 'LINE_LIMIT_EXCEEDED';
      axis: 'row' | 'col';
      index: number;
      limit: number;
      forcedPartnerType: BuildingType;
    }
  | {
      type: 'TOWN_HALL_PERIMETER_OBSTACLE';
      obstacleCoord: Coord;
      obstacleType: TileType;
    }
  | {
      type: 'IN_TOWN_HALL_PERIMETER';
      townHallCoord: Coord;
    }
  | {
      type: 'NO_ROAD_EXIT';
      buildingType: BuildingType;
    }
  | {
      type: 'TOWN_HALL_OVERFILLS_LINE';
      axis: 'row' | 'col';
      index: number;
      limit: number;
      explanation?: string;
      causalCoords?: Coord[];
    }
  | { type: 'LINE_CLUE_ZERO'; axis: 'row' | 'col'; index: number }
  | {
      type: 'LINE_QUOTA_SATISFIED';
      axis: 'row' | 'col';
      index: number;
      quota: number;
      placedDesc?: string[];
    }
  | {
      type: 'ONE_PER_LINE_RULE';
      axis: 'row' | 'col';
      index: number;
      existingCoord: Coord;
      buildingType: BuildingType;
    }
  | {
      type: 'NO_TOUCHING_SAME_BUILDING';
      existingCoord: Coord;
      buildingType: BuildingType;
    }
  | {
      type: 'POINTING_LINE';
      axis: 'row' | 'col';
      index: number;
      buildingType: BuildingType;
      spotsLabel: string;
      sourceCoord: Coord;
      sourceType: TileType;
    }
  | {
      type: 'PARTNER_FORCED';
      sourceCoord: Coord;
      sourceType: TileType;
      allowedTypes: BuildingType[];
    }
  | {
      type: 'BUILDING_PARTNER_REQUIRED';
      sourceCoord: Coord;
    }
  | {
      type: 'INVENTORY_EXHAUSTED';
      tileType: PlaceableType;
      count: number;
    }
  | {
      type: 'TOO_FAR_FROM_TOWN_HALL';
      maxRoads: number;
    }
  | { type: 'DEAD_END_ROAD' }
  | { type: 'NOT_ON_ROAD_PATH' }
  | {
      type: 'LINE_MUST_BE_FILLED';
      axis: 'row' | 'col';
      index: number;
      needed: number;
      spotText: string;
      discText: string;
    }
  | { type: 'CONTRADICTION'; contradiction: string };

export function formatEliminationReason(
  r: number,
  c: number,
  tile: TileType,
  reason: EliminationReason | string
): string {
  if (typeof reason === 'string') return reason;
  switch (reason.type) {
    case 'PLAYER_MARKED_EMPTY':
      return 'marked as clear ground';
    case 'PLAYER_MARKED_BUILDING':
      return 'marked as Building';
    case 'NO_ADJACENT_TREE':
      return 'no adjacent Tree';
    case 'NO_ADJACENT_HOUSE':
      return 'no adjacent spot for a House';
    case 'NO_ADJACENT_PARTNER':
      return 'no adjacent spot for a Woodcutter or Farm';
    case 'LINE_LIMIT_EXCEEDED': {
      const lineName =
        reason.axis === 'row' ? `Row ${reason.index + 1}` : `Column ${reason.index + 1}`;
      const partnerName =
        reason.forcedPartnerType === 'house' ? 'House' : 'Woodcutter/Farm';
      return `adjacent ${partnerName} would also be in ${lineName}, exceeding ${lineName}'s limit of ${reason.limit} building`;
    }
    case 'TOWN_HALL_PERIMETER_OBSTACLE':
      return `perimeter blocked by ${formatTileName(reason.obstacleType)} at ${xy(reason.obstacleCoord.r, reason.obstacleCoord.c)}`;
    case 'IN_TOWN_HALL_PERIMETER':
      return `in Town Hall perimeter around ${xy(reason.townHallCoord.r, reason.townHallCoord.c)}`;
    case 'NO_ROAD_EXIT':
      return 'no orthogonal exit for a Road';
    case 'TOWN_HALL_OVERFILLS_LINE': {
      if (reason.explanation) {
        return reason.explanation;
      }
      const lineName =
        reason.axis === 'row' ? `Row ${reason.index + 1}` : `Column ${reason.index + 1}`;
      return `Town Hall would overfill ${lineName} (limit of ${reason.limit})`;
    }
    case 'LINE_CLUE_ZERO': {
      const lineName =
        reason.axis === 'row' ? `Row ${reason.index + 1}` : `Column ${reason.index + 1}`;
      return `${lineName} clue is 0`;
    }
    case 'LINE_QUOTA_SATISFIED': {
      const lineName =
        reason.axis === 'row' ? `Row ${reason.index + 1}` : `Column ${reason.index + 1}`;
      const desc =
        reason.placedDesc && reason.placedDesc.length > 0
          ? ` (${reason.placedDesc.join(', ')})`
          : '';
      return `${lineName} already has all ${reason.quota} building(s) placed${desc}`;
    }
    case 'ONE_PER_LINE_RULE': {
      const lineName =
        reason.axis === 'row' ? `Row ${reason.index + 1}` : `Column ${reason.index + 1}`;
      return `${lineName} already has a ${formatTileName(reason.buildingType)} at ${xy(reason.existingCoord.r, reason.existingCoord.c)}`;
    }
    case 'NO_TOUCHING_SAME_BUILDING':
      return `touches ${formatTileName(reason.buildingType)} at ${xy(reason.existingCoord.r, reason.existingCoord.c)}`;
    case 'POINTING_LINE': {
      const lineName =
        reason.axis === 'row' ? `Row ${reason.index + 1}` : `Column ${reason.index + 1}`;
      return `${lineName}'s ${formatTileName(reason.buildingType)} must sit at ${reason.spotsLabel} next to the ${formatTileName(reason.sourceType)} at ${xy(reason.sourceCoord.r, reason.sourceCoord.c)}`;
    }
    case 'PARTNER_FORCED':
      return `must be a ${reason.allowedTypes.map(formatTileName).join(' or ')} for the ${formatTileName(reason.sourceType)} at ${xy(reason.sourceCoord.r, reason.sourceCoord.c)}`;
    case 'BUILDING_PARTNER_REQUIRED':
      return `must contain a partner building for the ${xy(reason.sourceCoord.r, reason.sourceCoord.c)} building`;
    case 'INVENTORY_EXHAUSTED':
      return `all ${reason.count} ${formatTileName(reason.tileType)}(s) already placed`;
    case 'TOO_FAR_FROM_TOWN_HALL':
      return `too far from Town Hall to connect within ${reason.maxRoads} Road(s)`;
    case 'DEAD_END_ROAD':
      return 'would be a dead-end road';
    case 'NOT_ON_ROAD_PATH':
      return 'not on the Road path to Town Hall';
    case 'LINE_MUST_BE_FILLED': {
      const lineName =
        reason.axis === 'row' ? `Row ${reason.index + 1}` : `Column ${reason.index + 1}`;
      return `${lineName} needs ${reason.needed} building(s), and ${reason.spotText}${reason.discText}`;
    }
    case 'CONTRADICTION':
      return reason.contradiction;
  }
}

export function formatDisqualifiedCellReason(
  r: number,
  c: number,
  reasons: Partial<Record<TileType, EliminationReason | string>>,
  level: LevelDefinition
): string {
  if (level.rowClues[r] === 0) return `Row ${r + 1} clue is 0`;
  if (level.colClues[c] === 0) return `Column ${c + 1} clue is 0`;

  const activeBuildings = BUILDING_TYPES.filter((b) => level.inventory[b] > 0);
  const activeReasons = activeBuildings
    .map((b) => reasons[b])
    .filter((reason): reason is EliminationReason | string => Boolean(reason));

  const first = activeReasons[0];
  if (first && typeof first !== 'string') {
    if (first.type === 'LINE_CLUE_ZERO' || first.type === 'LINE_QUOTA_SATISFIED') {
      const allSame = activeReasons.every(
        (ar) =>
          typeof ar !== 'string' &&
          ar.type === first.type &&
          (ar as any).axis === (first as any).axis &&
          (ar as any).index === (first as any).index
      );
      if (allSame) {
        return formatEliminationReason(r, c, 'house', first);
      }
    }
  }

  const items: string[] = [];
  for (const b of activeBuildings) {
    const rObj = reasons[b];
    if (rObj) {
      items.push(`not ${formatTileName(b)}: ${formatEliminationReason(r, c, b, rObj)}`);
    }
  }

  if (items.length > 0) return items.join(', ');

  const allRecorded = Object.entries(reasons)
    .filter(([t]) => isBuilding(t as TileType))
    .map(
      ([t, reason]) =>
        `not ${formatTileName(t as TileType)}: ${formatEliminationReason(r, c, t as TileType, reason!)}`
    );

  return allRecorded.length > 0 ? allRecorded.join(', ') : 'no building type can fit here';
}

export function summarizeCellNonBuildingReason(
  r: number,
  c: number,
  reasons: Partial<Record<TileType, EliminationReason | string>>,
  level: LevelDefinition
): string {
  if (level.rowClues[r] === 0) return `Row ${r + 1} clue is 0`;
  if (level.colClues[c] === 0) return `Column ${c + 1} clue is 0`;

  const houseReason = reasons['house'];
  if (
    houseReason &&
    typeof houseReason !== 'string' &&
    houseReason.type === 'LINE_QUOTA_SATISFIED'
  ) {
    return formatEliminationReason(r, c, 'house', houseReason);
  }

  const parts: string[] = [];
  if (reasons['woodcutter']) {
    parts.push(formatEliminationReason(r, c, 'woodcutter', reasons['woodcutter']));
  }
  if (reasons['house']) {
    parts.push(formatEliminationReason(r, c, 'house', reasons['house']));
  }
  if (reasons['farm']) {
    const fStr = formatEliminationReason(r, c, 'farm', reasons['farm']);
    if (!parts.includes(fStr)) {
      parts.push(fStr);
    }
  }
  if (reasons['town_hall']) {
    parts.push(formatEliminationReason(r, c, 'town_hall', reasons['town_hall']));
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  const allRecorded = Object.entries(reasons)
    .filter(([t]) => isBuilding(t as TileType))
    .map(
      ([t, text]) =>
        `${formatTileName(t as TileType)} (${formatEliminationReason(r, c, t as TileType, text!)})`
    );

  return allRecorded.length > 0 ? allRecorded.join(', ') : 'no building can fit here';
}

export function getDetailedCellDisqualificationPoints(
  r: number,
  c: number,
  reasons: Partial<Record<TileType, EliminationReason | string>>,
  level: LevelDefinition
): string[] {
  const points: string[] = [];
  const activeBuildings = BUILDING_TYPES.filter((b) => level.inventory[b] > 0);

  for (const b of activeBuildings) {
    const rawReason = reasons[b];
    if (b === 'woodcutter') {
      const text = rawReason
        ? formatEliminationReason(r, c, 'woodcutter', rawReason)
        : 'no adjacent Tree';
      points.push(`Woodcutter: ${text}`);
    } else if (b === 'town_hall') {
      const text = rawReason
        ? formatEliminationReason(r, c, 'town_hall', rawReason)
        : 'perimeter requirements not met';
      points.push(`Town Hall: ${text}`);
    } else if (b === 'house') {
      const text = rawReason
        ? formatEliminationReason(r, c, 'house', rawReason)
        : 'no adjacent Woodcutter or Farm';
      points.push(`House: ${text}`);
    } else if (b === 'farm') {
      const text = rawReason
        ? formatEliminationReason(r, c, 'farm', rawReason)
        : 'no adjacent House';
      points.push(`Farm: ${text}`);
    }
  }

  if (level.inventory.road > 0 && reasons['road']) {
    points.push(`Road: ${formatEliminationReason(r, c, 'road', reasons['road'])}`);
  }

  return points;
}

function shortestPossibleRoadDistance(
  domains: Set<TileType>[][],
  sr: number,
  sc: number,
  tr: number,
  tc: number,
  forbiddenCell?: Coord
): number {
  const size = domains.length;
  const dist = Array.from({ length: size }, () => Array(size).fill(Infinity));
  const queue: Coord[] = [];

  for (const n of getOrthoNeighbors(size, sr, sc)) {
    if (forbiddenCell && n.r === forbiddenCell.r && n.c === forbiddenCell.c) {
      continue;
    }
    if (domains[n.r][n.c].has('road')) {
      dist[n.r][n.c] = 1;
      queue.push(n);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const d = dist[curr.r][curr.c];

    for (const n of getOrthoNeighbors(size, curr.r, curr.c)) {
      if (n.r === tr && n.c === tc) {
        return d;
      }
      if (forbiddenCell && n.r === forbiddenCell.r && n.c === forbiddenCell.c) {
        continue;
      }
      if (domains[n.r][n.c].has('road') && dist[n.r][n.c] === Infinity) {
        dist[n.r][n.c] = d + 1;
        queue.push(n);
      }
    }
  }

  return Infinity;
}

/**
 * Fast connected-road-subgraph enumerator (Redelmeier-style) from Town Hall.
 */
export function findValidRoadNetworksForBuildings(
  baseGrid: TileType[][],
  targetRoads: number,
  maxFound = 2
): Coord[][] {
  const size = baseGrid.length;
  const results: Coord[][] = [];
  if (targetRoads === 0) return [[]];

  let th: Coord | null = null;
  const requiredTerminals: Coord[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = baseGrid[r][c];
      if (t === 'town_hall') th = { r, c };
      else if (t === 'woodcutter' || t === 'farm') {
        requiredTerminals.push({ r, c });
      }
    }
  }

  if (!th || requiredTerminals.length === 0) return [];

  for (const term of [th, ...requiredTerminals]) {
    if (
      !getOrthoNeighbors(size, term.r, term.c).some(
        (n) => baseGrid[n.r][n.c] === 'empty' || baseGrid[n.r][n.c] === 'road'
      )
    ) {
      return [];
    }
  }

  const grid = baseGrid.map((r) => [...r]);
  const initialFrontier = getOrthoNeighbors(size, th.r, th.c).filter(
    (n) => grid[n.r][n.c] === 'empty'
  );

  function recurse(chosen: Coord[], untried: Coord[], forbidden: Set<string>) {
    if (results.length >= maxFound) return;

    if (chosen.length === targetRoads) {
      for (const term of requiredTerminals) {
        const connected = getOrthoNeighbors(size, term.r, term.c).some(
          (n) => grid[n.r][n.c] === 'road'
        );
        if (!connected) return;
      }
      for (const rc of chosen) {
        if (!isRoadTileOnValidPath(grid, rc.r, rc.c)) return;
      }
      results.push(chosen.map((c) => ({ ...c })));
      return;
    }

    const remBudget = targetRoads - chosen.length;
    for (const term of requiredTerminals) {
      let minStepsNeeded = Infinity;
      for (const n of getOrthoNeighbors(size, term.r, term.c)) {
        if (grid[n.r][n.c] === 'road') {
          minStepsNeeded = 0;
          break;
        }
        if (grid[n.r][n.c] === 'empty') {
          if (chosen.length === 0) {
            for (const f of initialFrontier) {
              const d = Math.abs(n.r - f.r) + Math.abs(n.c - f.c) + 1;
              if (d < minStepsNeeded) minStepsNeeded = d;
            }
          } else {
            for (const ch of chosen) {
              const d = Math.abs(n.r - ch.r) + Math.abs(n.c - ch.c);
              if (d < minStepsNeeded) minStepsNeeded = d;
            }
          }
        }
      }
      if (minStepsNeeded > remBudget) return;
    }

    const localForbidden = new Set(forbidden);
    for (let i = 0; i < untried.length; i++) {
      const nextCell = untried[i];
      const key = `${nextCell.r},${nextCell.c}`;
      localForbidden.add(key);

      grid[nextCell.r][nextCell.c] = 'road';
      const nextChosen = [...chosen, nextCell];

      const nextUntried = untried.slice(i + 1);
      for (const n of getOrthoNeighbors(size, nextCell.r, nextCell.c)) {
        const nKey = `${n.r},${n.c}`;
        if (
          grid[n.r][n.c] === 'empty' &&
          !localForbidden.has(nKey) &&
          !nextUntried.some((u) => u.r === n.r && u.c === n.c)
        ) {
          nextUntried.push(n);
        }
      }

      recurse(nextChosen, nextUntried, localForbidden);
      grid[nextCell.r][nextCell.c] = 'empty';
      if (results.length >= maxFound) return;
    }
  }

  recurse([], initialFrontier, new Set());
  return results;
}

/**
 * Purely deductive human-rule solver (no guessing / no arbitrary trial-and-error).
 * Tracks per-cell elimination reasons so that if a cell is solved by process of elimination,
 * the hint clearly explains BOTH why the cell must be a building AND why all other buildings were ruled out.
 */
export function solveByDeduction(
  level: LevelDefinition,
  startingGrid?: TileType[][],
  playerMarks?: boolean[][],
  playerBuildingMarks?: boolean[][]
): DeductionResult {
  const size = level.size;
  const domains = createInitialDomains(level, startingGrid, playerMarks, playerBuildingMarks);
  const steps: DeductionHint[] = [];
  let lookaheadCount = 0;
  const hasTownHall = level.inventory.town_hall > 0;
  const maxRoads = level.inventory.road;

  // Store concise structured reasons why specific candidates were eliminated at each cell (r, c)
  const cellElimReasons: Record<string, Partial<Record<TileType, EliminationReason>>> = {};
  const recordedDisqualifiedCells = new Set<string>();
  const recordedMarkedBuildingCells = new Set<string>();
  const lookaheadEliminatedCells = new Set<string>();

  const currentBoardGrid: TileType[][] = startingGrid
    ? startingGrid.map((row) => [...row])
    : level.initialGrid.map((row) => [...row]);
  const currentBoardBuildingMarks: boolean[][] = playerBuildingMarks
    ? playerBuildingMarks.map((row) => [...row])
    : Array.from({ length: size }, () => Array(size).fill(false));

  const recordElimReason = (
    r: number,
    c: number,
    eliminatedType: TileType,
    reason: EliminationReason
  ) => {
    const key = `${r},${c}`;
    if (!cellElimReasons[key]) cellElimReasons[key] = {};
    if (!cellElimReasons[key][eliminatedType]) {
      cellElimReasons[key][eliminatedType] = reason;
    }
  };

  if (playerBuildingMarks) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (playerBuildingMarks[r][c]) {
          recordElimReason(r, c, 'empty', { type: 'PLAYER_MARKED_BUILDING' });
          recordElimReason(r, c, 'road', { type: 'PLAYER_MARKED_BUILDING' });
        }
      }
    }
  }

  if (playerMarks) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (playerMarks[r][c]) {
          for (const b of BUILDING_TYPES) {
            recordElimReason(r, c, b, { type: 'PLAYER_MARKED_EMPTY' });
          }
        }
      }
    }
  }

  /**
   * Summarizes why other currently-empty neighbors of (centerR, centerC) cannot hold `targetType`.
   */
  const explainWhyOtherOrthoNeighborsWereRuledOut = (
    centerR: number,
    centerC: number,
    chosenNeighbor: Coord,
    targetType: TileType
  ): string => {
    const otherEmpty = getOrthoNeighbors(size, centerR, centerC).filter(
      (n) =>
        (n.r !== chosenNeighbor.r || n.c !== chosenNeighbor.c) &&
        !isFixedObstacle(level.initialGrid[n.r][n.c]) &&
        (!startingGrid || startingGrid[n.r][n.c] === 'empty')
    );
    if (otherEmpty.length === 0) return '';

    const parts = otherEmpty.map((n) => {
      const reasonObj =
        cellElimReasons[`${n.r},${n.c}`]?.[targetType] ??
        cellElimReasons[`${n.r},${n.c}`]?.['empty'];
      return reasonObj
        ? `${xy(n.r, n.c)} cannot be a ${formatTileName(targetType)} (${formatEliminationReason(n.r, n.c, targetType, reasonObj)})`
        : `${xy(n.r, n.c)} cannot be a ${formatTileName(targetType)}`;
    });

    return ` — ${parts.join('; ')}`;
  };

  /**
   * Called when a rule directly locks (r, c) or eliminates the last alternative.
   * If `isDirectForce` is false (locked via process of elimination), builds a clear summary
   * explaining why the remaining tile is the only possibility left at (r, c)!
   */
  const recordLockIfNew = (
    r: number,
    c: number,
    prevSize: number,
    ruleName: string,
    explanation: string,
    isDirectForce = false,
    customSteps?: HintStep[]
  ) => {
    if (prevSize > 1 && domains[r][c].size === 1) {
      const locked = getLockedTile(domains[r][c])!;
      currentBoardGrid[r][c] = locked;
      if (currentBoardBuildingMarks[r][c] && locked !== 'empty') {
        currentBoardBuildingMarks[r][c] = false;
      }
      if (locked === 'empty') {
        let finalRuleName = ruleName;
        let finalExplanation = explanation;
        let finalSteps = customSteps;

        if (!isDirectForce) {
          const reasons = cellElimReasons[`${r},${c}`] ?? {};
          const points = getDetailedCellDisqualificationPoints(r, c, reasons, level);

          finalRuleName = 'No Buildings Fit';
          finalExplanation = `No village buildings can be placed at ${xy(r, c)} (${points.join('; ')}), so this space must be marked as clear ground (Grass).`;

          if (!finalSteps) {
            finalSteps = [
              {
                title: 'No Buildings Fit',
                message:
                  `No village buildings can be placed at ${xy(r, c)}:\n` +
                  points.map((p) => `• ${p}`).join('\n'),
                focusCells: [{ r, c }],
                candidateCells: [{ r, c }],
                discardedCells: [{ r, c }]
              },
              {
                title: 'Mark as Clear Ground',
                message: `Since no buildings can fit at ${xy(r, c)}, this space must be marked as clear ground (Grass).`,
                targetCell: { r, c }
              }
            ];
          }
        } else if (!finalSteps) {
          const rowMatch = explanation.match(/Row (\d+)/i);
          const colMatch = explanation.match(/Column (\d+)/i);
          const highlightLine = rowMatch
            ? { axis: 'row' as const, index: parseInt(rowMatch[1], 10) - 1 }
            : colMatch
              ? { axis: 'col' as const, index: parseInt(colMatch[1], 10) - 1 }
              : undefined;

          finalSteps = [
            {
              title: ruleName,
              message: explanation,
              highlightLine,
              candidateCells: [{ r, c }]
            },
            {
              title: ruleName,
              message: `So ${xy(r, c)} cannot contain a building and must be empty.`,
              highlightLine,
              targetCell: { r, c }
            }
          ];
        }

        steps.push({
          r,
          c,
          action: 'mark_empty',
          ruleName: finalRuleName,
          explanation: finalExplanation,
          steps: finalSteps
        });
      } else if (locked !== 'tree' && locked !== 'rock') {
        currentBoardGrid[r][c] = locked;
        let finalRuleName = ruleName;
        let finalExplanation = explanation;
        let finalSteps = customSteps;

        if (!isDirectForce) {
          // Locked by eliminating the last alternative! Build a crystal-clear summary of why `locked` is the only option left.
          const reasons = cellElimReasons[`${r},${c}`] ?? {};
          const otherBuildings = BUILDING_TYPES.filter(
            (b) => b !== locked && level.inventory[b] > 0
          );
          const ruledOutNotes = otherBuildings
            .map((b) => {
              const rObj = reasons[b];
              return rObj
                ? `not ${formatTileName(b)} (${formatEliminationReason(r, c, b, rObj)})`
                : `not ${formatTileName(b)}`;
            })
            .join(', ');

          const mustBeBuildingReason =
            ruleName === 'Row Must Be Filled' || ruleName === 'Column Must Be Filled'
              ? explanation
              : (reasons['empty']
                  ? formatEliminationReason(r, c, 'empty', reasons['empty'])
                  : explanation ?? 'this spot must contain a building');

          if (isBuilding(locked)) {
            finalRuleName = `Only ${formatTileName(locked)} Fits`;
            finalExplanation = `${xy(r, c)} must be a ${formatTileName(locked)}: ${mustBeBuildingReason}, and it is ${ruledOutNotes}.`;

            if (!finalSteps) {
              let highlightLine: { axis: 'row' | 'col'; index: number } | undefined = undefined;
              if (ruleName === 'Row Must Be Filled') {
                highlightLine = { axis: 'row', index: r };
              } else if (ruleName === 'Column Must Be Filled') {
                highlightLine = { axis: 'col', index: c };
              } else {
                const isContradiction =
                  lookaheadEliminatedCells.has(`${r},${c}`) ||
                  mustBeBuildingReason.includes("wouldn't have") ||
                  mustBeBuildingReason.includes('would exceed') ||
                  mustBeBuildingReason.includes('would lead');

                if (!isContradiction) {
                  const rowMatch = mustBeBuildingReason.match(/Row (\d+)/i);
                  const colMatch = mustBeBuildingReason.match(/Column (\d+)/i);
                  const matched = rowMatch
                    ? { axis: 'row' as const, index: parseInt(rowMatch[1], 10) - 1 }
                    : colMatch
                      ? { axis: 'col' as const, index: parseInt(colMatch[1], 10) - 1 }
                      : undefined;
                  if (matched) {
                    const isCellInLine =
                      matched.axis === 'row' ? r === matched.index : c === matched.index;
                    if (isCellInLine) {
                      highlightLine = matched;
                    }
                  }
                }
              }

              const allOpenInLine: Coord[] = [];
              const openDisqualifiedInLine: Coord[] = [];
              if (highlightLine) {
                if (highlightLine.axis === 'row') {
                  const lr = highlightLine.index;
                  for (let cc = 0; cc < size; cc++) {
                    const isObstacle = isFixedObstacle(level.initialGrid[lr][cc]);
                    const isPlaced = startingGrid && startingGrid[lr][cc] !== 'empty';
                    const isMarked = playerMarks && playerMarks[lr][cc];
                    if (!isObstacle && !isPlaced && !isMarked) {
                      allOpenInLine.push({ r: lr, c: cc });
                      if (!canBeAnyBuilding(domains[lr][cc])) {
                        openDisqualifiedInLine.push({ r: lr, c: cc });
                      }
                    }
                  }
                } else {
                  const lc = highlightLine.index;
                  for (let rr = 0; rr < size; rr++) {
                    const isObstacle = isFixedObstacle(level.initialGrid[rr][lc]);
                    const isPlaced = startingGrid && startingGrid[rr][lc] !== 'empty';
                    const isMarked = playerMarks && playerMarks[rr][lc];
                    if (!isObstacle && !isPlaced && !isMarked) {
                      allOpenInLine.push({ r: rr, c: lc });
                      if (!canBeAnyBuilding(domains[rr][lc])) {
                        openDisqualifiedInLine.push({ r: rr, c: lc });
                      }
                    }
                  }
                }
              }

              if (openDisqualifiedInLine.length > 0) {
                openDisqualifiedInLine.sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
                allOpenInLine.sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
                const linePremise = mustBeBuildingReason.replace(/, and .*/i, '');

                finalSteps = [
                  {
                    title: finalRuleName,
                    message: `${linePremise}.`,
                    highlightLine,
                    candidateCells: allOpenInLine
                  }
                ];

                for (const disc of openDisqualifiedInLine) {
                  const discReasons = cellElimReasons[`${disc.r},${disc.c}`] ?? {};
                  const discReasonText = formatDisqualifiedCellReason(
                    disc.r,
                    disc.c,
                    discReasons,
                    level
                  );
                  finalSteps.push({
                    title: finalRuleName,
                    message: `${xy(disc.r, disc.c)} cannot hold a building (${discReasonText}).`,
                    highlightLine,
                    focusCells: [disc],
                    discardedCells: [disc]
                  });
                }

                const lineAxisName = highlightLine!.axis === 'row' ? 'Row' : 'Column';
                const lineNum = highlightLine!.index + 1;
                const remainingBuildingSpots = allOpenInLine.filter((coord) =>
                  canBeAnyBuilding(domains[coord.r][coord.c])
                );

                const transitionMsg =
                  remainingBuildingSpots.length <= 1
                    ? `So ${xy(r, c)} is the only remaining open spot in ${lineAxisName} ${lineNum} that can hold a building!`
                    : `${lineAxisName} ${lineNum} needs ${remainingBuildingSpots.length} building(s) and only ${remainingBuildingSpots.map((s) => xy(s.r, s.c)).join(' and ')} remain, so ${xy(r, c)} must contain a building!`;

                finalSteps.push({
                  title: finalRuleName,
                  message: transitionMsg,
                  highlightLine,
                  focusCells: [{ r, c }],
                  candidateCells: remainingBuildingSpots
                });
              } else {
                const premiseMsg =
                  lookaheadEliminatedCells.has(`${r},${c}`) ||
                  mustBeBuildingReason.includes("wouldn't have") ||
                  mustBeBuildingReason.includes('would exceed')
                    ? `If ${xy(r, c)} were empty, it would lead to a contradiction (${mustBeBuildingReason}), so this spot must contain a building.`
                    : `${xy(r, c)} must contain a building (${mustBeBuildingReason}).`;

                finalSteps = [
                  {
                    title: finalRuleName,
                    message: premiseMsg,
                    highlightLine,
                    focusCells: [{ r, c }],
                    candidateCells: [{ r, c }]
                  }
                ];
              }

              for (const b of otherBuildings) {
                const rObj = reasons[b];
                const rText = rObj ? formatEliminationReason(r, c, b, rObj) : undefined;
                finalSteps.push({
                  title: finalRuleName,
                  message: `${xy(r, c)} cannot be a ${formatTileName(b)}${rText ? ` (${rText})` : ''}.`,
                  focusCells: [{ r, c }],
                  discardedCells: [{ r, c }]
                });
              }

              finalSteps.push({
                title: finalRuleName,
                message: `Therefore, ${xy(r, c)} must be a ${formatTileName(locked)}!`,
                focusCells: [{ r, c }],
                targetCell: { r, c }
              });
            }
          } else {
            finalRuleName = `Must Be Road`;
            finalExplanation = `${xy(r, c)} cannot be a building or empty (${explanation}), so it must be a Road.`;
            if (!finalSteps) {
              finalSteps = [
                {
                  title: finalRuleName,
                  message: explanation,
                  focusCells: [{ r, c }],
                  candidateCells: [{ r, c }]
                },
                {
                  title: finalRuleName,
                  message: `So ${xy(r, c)} must be a Road to connect the town.`,
                  focusCells: [{ r, c }],
                  targetCell: { r, c }
                }
              ];
            }
          }
        }

        if (!finalSteps) {
          finalSteps = [
            {
              title: finalRuleName,
              message: finalExplanation,
              candidateCells: [{ r, c }]
            },
            {
              title: finalRuleName,
              message: `Place a ${formatTileName(locked)} at ${xy(r, c)}.`,
              targetCell: { r, c }
            }
          ];
        }

        steps.push({
          r,
          c,
          action: 'place',
          tileType: locked,
          ruleName: finalRuleName,
          explanation: finalExplanation,
          steps: finalSteps
        });
      }
    }
  };

  let progress = true;
  while (progress) {
    progress = false;

    // --- RULE 1: Row & Column Clue Zero / Completed Elimination ---
    for (let r = 0; r < size; r++) {
      let placedInRow = 0;
      const placedDesc: string[] = [];
      for (let cc = 0; cc < size; cc++) {
        const t = currentBoardGrid[r][cc];
        if (isBuilding(t)) {
          placedInRow++;
          placedDesc.push(`${formatTileName(t)} at ${xy(r, cc)}`);
        } else if (currentBoardBuildingMarks[r][cc]) {
          placedInRow++;
          placedDesc.push(`Building at ${xy(r, cc)}`);
        }
      }
      const isFullyPlaced = placedInRow === level.rowClues[r];
      const isZero = level.rowClues[r] === 0;

      if (isZero || isFullyPlaced) {
        for (let c = 0; c < size; c++) {
          if (isBuilding(currentBoardGrid[r][c]) || currentBoardBuildingMarks[r][c]) {
            continue;
          }
          if (domains[r][c].size > 1 && canBeAnyBuilding(domains[r][c])) {
            const prev = domains[r][c].size;
            const reason: EliminationReason = isZero
              ? { type: 'LINE_CLUE_ZERO', axis: 'row', index: r }
              : { type: 'LINE_QUOTA_SATISFIED', axis: 'row', index: r, quota: level.rowClues[r], placedDesc };
            for (const b of BUILDING_TYPES) {
              recordElimReason(r, c, b, reason);
            }
            if (removeBuildingsFromDomain(domains[r][c])) {
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Row Clue Complete',
                isZero
                  ? `Row ${r + 1} has a clue of 0, so no buildings can be placed in Row ${r + 1}.`
                  : `Row ${r + 1} already has all ${level.rowClues[r]} of its placed buildings, so ${xy(r, c)} cannot be a building.`,
                true
              );
            }
          }
        }
      }
    }

    for (let c = 0; c < size; c++) {
      let placedInCol = 0;
      const placedDesc: string[] = [];
      for (let rr = 0; rr < size; rr++) {
        const t = currentBoardGrid[rr][c];
        if (isBuilding(t)) {
          placedInCol++;
          placedDesc.push(`${formatTileName(t)} at ${xy(rr, c)}`);
        } else if (currentBoardBuildingMarks[rr][c]) {
          placedInCol++;
          placedDesc.push(`Building at ${xy(rr, c)}`);
        }
      }
      const isFullyPlaced = placedInCol === level.colClues[c];
      const isZero = level.colClues[c] === 0;

      if (isZero || isFullyPlaced) {
        for (let r = 0; r < size; r++) {
          if (isBuilding(currentBoardGrid[r][c]) || currentBoardBuildingMarks[r][c]) {
            continue;
          }
          if (domains[r][c].size > 1 && canBeAnyBuilding(domains[r][c])) {
            const prev = domains[r][c].size;
            const reason: EliminationReason = isZero
              ? { type: 'LINE_CLUE_ZERO', axis: 'col', index: c }
              : { type: 'LINE_QUOTA_SATISFIED', axis: 'col', index: c, quota: level.colClues[c], placedDesc };
            for (const b of BUILDING_TYPES) {
              recordElimReason(r, c, b, reason);
            }
            if (removeBuildingsFromDomain(domains[r][c])) {
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Column Clue Complete',
                isZero
                  ? `Column ${c + 1} has a clue of 0, so no buildings can be placed in Column ${c + 1}.`
                  : `Column ${c + 1} already has all ${level.colClues[c]} of its placed buildings, so ${xy(r, c)} cannot be a building.`,
                true
              );
            }
          }
        }
      }
    }

    // --- RULE 3: Adjacency & Neighborhood Pruning ---
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dom = domains[r][c];
        const prev = dom.size;
        const ortho = getOrthoNeighbors(size, r, c);
        const surr8 = getSurrounding8Neighbors(size, r, c);

        if (dom.has('woodcutter')) {
          const hasTree = ortho.some((n) => domains[n.r][n.c].has('tree'));
          const houseSpots = ortho.filter((n) => domains[n.r][n.c].has('house'));
          if (!hasTree || houseSpots.length === 0) {
            dom.delete('woodcutter');
            const elimReason: EliminationReason = !hasTree
              ? { type: 'NO_ADJACENT_TREE' }
              : { type: 'NO_ADJACENT_HOUSE', buildingType: 'woodcutter' };
            recordElimReason(r, c, 'woodcutter', elimReason);
            progress = true;
            recordLockIfNew(
              r,
              c,
              prev,
              !hasTree ? 'Woodcutter Needs Tree' : 'Woodcutter Needs House',
              !hasTree
                ? `${xy(r, c)} is not orthogonally next to a Tree, so it cannot be a Woodcutter.`
                : `${xy(r, c)} has no adjacent spot for a House, so it cannot be a Woodcutter.`
            );
          } else {
            const allHouseInSameRow = houseSpots.every((n) => n.r === r);
            const allHouseInSameCol = houseSpots.every((n) => n.c === c);
            if (allHouseInSameRow && level.rowClues[r] < 2) {
              dom.delete('woodcutter');
              const elimReason: EliminationReason = {
                type: 'LINE_LIMIT_EXCEEDED',
                axis: 'row',
                index: r,
                limit: level.rowClues[r],
                forcedPartnerType: 'house'
              };
              recordElimReason(r, c, 'woodcutter', elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Row Limit Exceeded',
                `${xy(r, c)} cannot be a Woodcutter because its adjacent House would also have to be in Row ${r + 1}, exceeding Row ${r + 1}'s limit of ${level.rowClues[r]} building.`
              );
            } else if (allHouseInSameCol && level.colClues[c] < 2) {
              dom.delete('woodcutter');
              const elimReason: EliminationReason = {
                type: 'LINE_LIMIT_EXCEEDED',
                axis: 'col',
                index: c,
                limit: level.colClues[c],
                forcedPartnerType: 'house'
              };
              recordElimReason(r, c, 'woodcutter', elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Column Limit Exceeded',
                `${xy(r, c)} cannot be a Woodcutter because its adjacent House would also have to be in Column ${c + 1}, exceeding Column ${c + 1}'s limit of ${level.colClues[c]} building.`
              );
            }
          }
        }

        if (dom.has('town_hall')) {
          const blocker = surr8.find((n) => {
            const nd = domains[n.r][n.c];
            return nd.has('tree') || nd.has('rock') || mustBeBuilding(nd);
          });
          if (blocker) {
            dom.delete('town_hall');
            const initT = level.initialGrid[blocker.r][blocker.c];
            const lockedT = getLockedTile(domains[blocker.r][blocker.c]);
            const obstacleType = isFixedObstacle(initT)
              ? initT
              : lockedT && isBuilding(lockedT)
                ? lockedT
                : 'rock';
            const elimReason: EliminationReason = {
              type: 'TOWN_HALL_PERIMETER_OBSTACLE',
              obstacleCoord: blocker,
              obstacleType
            };
            recordElimReason(
              r,
              c,
              'town_hall',
              elimReason
            );
            progress = true;
            recordLockIfNew(
              r,
              c,
              prev,
              'Town Hall Perimeter',
              `Town Hall requires all 8 surrounding squares to be clear, and ${xy(blocker.r, blocker.c)} is in its perimeter.`
            );
          }
        }

        if (dom.has('house')) {
          const partnerSpots = ortho.filter(
            (n) =>
              domains[n.r][n.c].has('woodcutter') ||
              domains[n.r][n.c].has('farm')
          );
          if (partnerSpots.length === 0) {
            dom.delete('house');
            const elimReason: EliminationReason = {
              type: 'NO_ADJACENT_PARTNER',
              buildingType: 'house'
            };
            recordElimReason(
              r,
              c,
              'house',
              elimReason
            );
            progress = true;
            recordLockIfNew(
              r,
              c,
              prev,
              'House Adjacency',
              `${xy(r, c)} has no adjacent spot for a Woodcutter or Farm, so it cannot be a House.`
            );
          } else {
            const allPartnerInSameRow = partnerSpots.every((n) => n.r === r);
            const allPartnerInSameCol = partnerSpots.every((n) => n.c === c);
            if (allPartnerInSameRow && level.rowClues[r] < 2) {
              dom.delete('house');
              const elimReason: EliminationReason = {
                type: 'LINE_LIMIT_EXCEEDED',
                axis: 'row',
                index: r,
                limit: level.rowClues[r],
                forcedPartnerType: 'farm'
              };
              recordElimReason(r, c, 'house', elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Row Limit Exceeded',
                `${xy(r, c)} cannot be a House because its adjacent Woodcutter or Farm would also have to be in Row ${r + 1}, exceeding Row ${r + 1}'s limit of ${level.rowClues[r]} building.`
              );
            } else if (allPartnerInSameCol && level.colClues[c] < 2) {
              dom.delete('house');
              const elimReason: EliminationReason = {
                type: 'LINE_LIMIT_EXCEEDED',
                axis: 'col',
                index: c,
                limit: level.colClues[c],
                forcedPartnerType: 'farm'
              };
              recordElimReason(r, c, 'house', elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Column Limit Exceeded',
                `${xy(r, c)} cannot be a House because its adjacent Woodcutter or Farm would also have to be in Column ${c + 1}, exceeding Column ${c + 1}'s limit of ${level.colClues[c]} building.`
              );
            }
          }
        }

        if (dom.has('farm')) {
          const houseSpots = ortho.filter((n) => domains[n.r][n.c].has('house'));
          if (houseSpots.length === 0) {
            dom.delete('farm');
            const elimReason: EliminationReason = {
              type: 'NO_ADJACENT_HOUSE',
              buildingType: 'farm'
            };
            recordElimReason(r, c, 'farm', elimReason);
            progress = true;
            recordLockIfNew(
              r,
              c,
              prev,
              'Farm Adjacency',
              `${xy(r, c)} has no adjacent spot for a House, so it cannot be a Farm.`
            );
          } else {
            const allHouseInSameRow = houseSpots.every((n) => n.r === r);
            const allHouseInSameCol = houseSpots.every((n) => n.c === c);
            if (allHouseInSameRow && level.rowClues[r] < 2) {
              dom.delete('farm');
              const elimReason: EliminationReason = {
                type: 'LINE_LIMIT_EXCEEDED',
                axis: 'row',
                index: r,
                limit: level.rowClues[r],
                forcedPartnerType: 'house'
              };
              recordElimReason(r, c, 'farm', elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Row Limit Exceeded',
                `${xy(r, c)} cannot be a Farm because its adjacent House would also have to be in Row ${r + 1}, exceeding Row ${r + 1}'s limit of ${level.rowClues[r]} building.`
              );
            } else if (allHouseInSameCol && level.colClues[c] < 2) {
              dom.delete('farm');
              const elimReason: EliminationReason = {
                type: 'LINE_LIMIT_EXCEEDED',
                axis: 'col',
                index: c,
                limit: level.colClues[c],
                forcedPartnerType: 'house'
              };
              recordElimReason(r, c, 'farm', elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Column Limit Exceeded',
                `${xy(r, c)} cannot be a Farm because its adjacent House would also have to be in Column ${c + 1}, exceeding Column ${c + 1}'s limit of ${level.colClues[c]} building.`
              );
            }
          }
        }

        if (hasTownHall) {
          for (const roadBuilding of [
            'woodcutter',
            'farm',
            'town_hall'
          ] as const) {
            if (dom.has(roadBuilding)) {
              const hasRoadNeighbor = ortho.some((n) =>
                domains[n.r][n.c].has('road')
              );
              if (!hasRoadNeighbor) {
                dom.delete(roadBuilding);
                const elimReason: EliminationReason = {
                  type: 'NO_ROAD_EXIT',
                  buildingType: roadBuilding
                };
                recordElimReason(
                  r,
                  c,
                  roadBuilding,
                  elimReason
                );
                progress = true;
                recordLockIfNew(
                  r,
                  c,
                  prev,
                  'Road Connection Required',
                  `${formatTileName(roadBuilding)} at ${xy(r, c)} would have no way to connect to a Road.`
                );
              }
            }
          }

          if (dom.has('road')) {
            const connNeighbors = ortho.filter((n) =>
              canBeRoadEndpointOrRoad(domains[n.r][n.c])
            );
            if (connNeighbors.length < 2) {
              dom.delete('road');
              const elimReason: EliminationReason = {
                type: 'DEAD_END_ROAD'
              };
              recordElimReason(r, c, 'road', elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Dead-End Road Elimination',
                `A Road at ${xy(r, c)} would be a dead end and cannot connect two points.`
              );
            }
          }
        }
      }
    }

    // --- RULE 4: Confirmed Building Eliminations ---
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const locked = getLockedTile(domains[r][c]);
        if (!locked || !isBuilding(locked)) continue;

        for (let cc = 0; cc < size; cc++) {
          if (cc !== c && domains[r][cc].has(locked)) {
            const prev = domains[r][cc].size;
            domains[r][cc].delete(locked);
            const elimReason: EliminationReason = {
              type: 'ONE_PER_LINE_RULE',
              axis: 'row',
              index: r,
              existingCoord: { r, c },
              buildingType: locked
            };
            recordElimReason(r, cc, locked, elimReason);
            progress = true;
            recordLockIfNew(
              r,
              cc,
              prev,
              'One Per Row Rule',
              `Row ${r + 1} already has a ${formatTileName(locked)} at ${xy(r, c)}.`
            );
          }
        }
        for (let rr = 0; rr < size; rr++) {
          if (rr !== r && domains[rr][c].has(locked)) {
            const prev = domains[rr][c].size;
            domains[rr][c].delete(locked);
            const elimReason: EliminationReason = {
              type: 'ONE_PER_LINE_RULE',
              axis: 'col',
              index: c,
              existingCoord: { r, c },
              buildingType: locked
            };
            recordElimReason(rr, c, locked, elimReason);
            progress = true;
            recordLockIfNew(
              rr,
              c,
              prev,
              'One Per Column Rule',
              `Column ${c + 1} already has a ${formatTileName(locked)} at ${xy(r, c)}.`
            );
          }
        }

        for (const n of getSurrounding8Neighbors(size, r, c)) {
          if (domains[n.r][n.c].has(locked)) {
            const prev = domains[n.r][n.c].size;
            domains[n.r][n.c].delete(locked);
            const elimReason: EliminationReason = {
              type: 'NO_TOUCHING_SAME_BUILDING',
              existingCoord: { r, c },
              buildingType: locked
            };
            recordElimReason(n.r, n.c, locked, elimReason);
            progress = true;
            recordLockIfNew(
              n.r,
              n.c,
              prev,
              'No Touching Same Building',
              `Cannot place a ${formatTileName(locked)} adjacent to the ${formatTileName(locked)} at ${xy(r, c)}.`
            );
          }
          if (locked === 'town_hall' && canBeAnyBuilding(domains[n.r][n.c])) {
            const prev = domains[n.r][n.c].size;
            const elimReason: EliminationReason = {
              type: 'IN_TOWN_HALL_PERIMETER',
              townHallCoord: { r, c }
            };
            for (const b of BUILDING_TYPES) {
              recordElimReason(n.r, n.c, b, elimReason);
            }
            if (removeBuildingsFromDomain(domains[n.r][n.c])) {
              progress = true;
              recordLockIfNew(
                n.r,
                n.c,
                prev,
                'Town Hall Perimeter',
                `Squares surrounding the Town Hall at ${xy(r, c)} cannot contain buildings.`
              );
            }
          }
        }
      }
    }

    // --- RULE 5: Forced Adjacency Partners & Line Claiming ---
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const locked = getLockedTile(domains[r][c]);
        const ortho = getOrthoNeighbors(size, r, c);

        // 6a. Tree needs a Woodcutter
        if (locked === 'tree') {
          const wcNeighbors = ortho.filter((n) =>
            domains[n.r][n.c].has('woodcutter')
          );
          if (wcNeighbors.length === 1) {
            const target = wcNeighbors[0];
            const dom = domains[target.r][target.c];
            if (dom.size > 1) {
              const prev = dom.size;
              dom.clear();
              dom.add('woodcutter');
              progress = true;
              const otherWhy = explainWhyOtherOrthoNeighborsWereRuledOut(
                r,
                c,
                target,
                'woodcutter'
              );
              const otherEmpty = ortho.filter(
                (n) =>
                  (n.r !== target.r || n.c !== target.c) &&
                  !isFixedObstacle(level.initialGrid[n.r][n.c]) &&
                  (!startingGrid || startingGrid[n.r][n.c] === 'empty')
              );
              const customSteps: HintStep[] = [
                {
                  title: 'Tree Needs Woodcutter',
                  message: `Tree needs a Woodcutter: Every Tree must have a Woodcutter next to it.`,
                  focusCells: [{ r, c }],
                  candidateCells: [target, ...otherEmpty]
                }
              ];
              for (const n of otherEmpty) {
                const reasonObj =
                  cellElimReasons[`${n.r},${n.c}`]?.['woodcutter'] ??
                  cellElimReasons[`${n.r},${n.c}`]?.['empty'];
                const reason = reasonObj
                  ? formatEliminationReason(n.r, n.c, 'woodcutter', reasonObj)
                  : undefined;
                customSteps.push({
                  title: 'Tree Needs Woodcutter',
                  message: reason
                    ? `${xy(n.r, n.c)} cannot be a Woodcutter (${reason}).`
                    : `${xy(n.r, n.c)} cannot be a Woodcutter.`,
                  focusCells: [{ r, c }],
                  discardedCells: [n]
                });
              }
              customSteps.push({
                title: 'Tree Needs Woodcutter',
                message:
                  otherEmpty.length > 0
                    ? `That leaves ${xy(target.r, target.c)} as the only valid spot next to the Tree at ${xy(r, c)}.`
                    : `${xy(target.r, target.c)} is the only adjacent spot next to the Tree at ${xy(r, c)} for a Woodcutter.`,
                focusCells: [{ r, c }],
                targetCell: target
              });

              recordLockIfNew(
                target.r,
                target.c,
                prev,
                'Tree Needs Woodcutter',
                `Every Tree must have a Woodcutter next to it, so ${xy(target.r, target.c)} is the only valid spot next to the Tree at ${xy(r, c)}${otherWhy}.`,
                true,
                customSteps
              );
            }
          } else if (wcNeighbors.length > 1) {
            const spotsLabel = wcNeighbors
              .map((n) => xy(n.r, n.c))
              .join(' or ');
            const sharedRow = wcNeighbors.every(
              (n) => n.r === wcNeighbors[0].r
            )
              ? wcNeighbors[0].r
              : -1;
            const sharedCol = wcNeighbors.every(
              (n) => n.c === wcNeighbors[0].c
            )
              ? wcNeighbors[0].c
              : -1;

            if (sharedRow !== -1) {
              for (let cc = 0; cc < size; cc++) {
                if (
                  !wcNeighbors.some((n) => n.c === cc) &&
                  domains[sharedRow][cc].has('woodcutter')
                ) {
                  const prev = domains[sharedRow][cc].size;
                  domains[sharedRow][cc].delete('woodcutter');
                  const elimReason: EliminationReason = {
                    type: 'POINTING_LINE',
                    axis: 'row',
                    index: sharedRow,
                    buildingType: 'woodcutter',
                    spotsLabel,
                    sourceCoord: { r, c },
                    sourceType: 'tree'
                  };
                  recordElimReason(sharedRow, cc, 'woodcutter', elimReason);
                  progress = true;
                  recordLockIfNew(
                    sharedRow,
                    cc,
                    prev,
                    'Row Woodcutter Claimed',
                    formatEliminationReason(sharedRow, cc, 'woodcutter', elimReason)
                  );
                }
              }
            }
            if (sharedCol !== -1) {
              for (let rr = 0; rr < size; rr++) {
                if (
                  !wcNeighbors.some((n) => n.r === rr) &&
                  domains[rr][sharedCol].has('woodcutter')
                ) {
                  const prev = domains[rr][sharedCol].size;
                  domains[rr][sharedCol].delete('woodcutter');
                  const elimReason: EliminationReason = {
                    type: 'POINTING_LINE',
                    axis: 'col',
                    index: sharedCol,
                    buildingType: 'woodcutter',
                    spotsLabel,
                    sourceCoord: { r, c },
                    sourceType: 'tree'
                  };
                  recordElimReason(rr, sharedCol, 'woodcutter', elimReason);
                  progress = true;
                  recordLockIfNew(
                    rr,
                    sharedCol,
                    prev,
                    'Column Woodcutter Claimed',
                    formatEliminationReason(rr, sharedCol, 'woodcutter', elimReason)
                  );
                }
              }
            }
          }
        }

        // 6b. Woodcutter and Farm each need a House
        if (locked === 'farm' || locked === 'woodcutter') {
          // If startingGrid is provided, only deduce a neighbor for buildings ACTUALLY placed on the player's board!
          if (startingGrid && startingGrid[r][c] !== locked) {
            continue;
          }

          const houseNeighbors = ortho.filter((n) =>
            domains[n.r][n.c].has('house')
          );
          if (houseNeighbors.length === 1) {
            const target = houseNeighbors[0];
            const dom = domains[target.r][target.c];
            if (dom.size > 1) {
              const prev = dom.size;
              dom.clear();
              dom.add('house');
              progress = true;
              const otherWhy = explainWhyOtherOrthoNeighborsWereRuledOut(
                r,
                c,
                target,
                'house'
              );
              const otherEmpty = ortho.filter(
                (n) =>
                  (n.r !== target.r || n.c !== target.c) &&
                  !isFixedObstacle(level.initialGrid[n.r][n.c]) &&
                  (!startingGrid || startingGrid[n.r][n.c] === 'empty')
              );
              const customSteps: HintStep[] = [
                {
                  title: `${formatTileName(locked)} Needs House`,
                  message: `The ${formatTileName(locked)} at ${xy(r, c)} must touch a House.`,
                  focusCells: [{ r, c }],
                  candidateCells: [target, ...otherEmpty]
                }
              ];
              for (const n of otherEmpty) {
                const reasonObj =
                  cellElimReasons[`${n.r},${n.c}`]?.['house'] ??
                  cellElimReasons[`${n.r},${n.c}`]?.['empty'];
                const reason = reasonObj
                  ? formatEliminationReason(n.r, n.c, 'house', reasonObj)
                  : undefined;
                customSteps.push({
                  title: `${formatTileName(locked)} Needs House`,
                  message: reason
                    ? `${xy(n.r, n.c)} cannot be a House (${reason}).`
                    : `${xy(n.r, n.c)} cannot be a House.`,
                  focusCells: [{ r, c }],
                  discardedCells: [n]
                });
              }
              customSteps.push({
                title: `${formatTileName(locked)} Needs House`,
                message:
                  otherEmpty.length > 0
                    ? `That leaves ${xy(target.r, target.c)} as the only valid spot next to the ${formatTileName(locked)} at ${xy(r, c)}.`
                    : `${xy(target.r, target.c)} is the only adjacent spot next to the ${formatTileName(locked)} at ${xy(r, c)} for a House.`,
                focusCells: [{ r, c }],
                targetCell: target
              });

              recordLockIfNew(
                target.r,
                target.c,
                prev,
                `${formatTileName(locked)} Needs House`,
                `The ${formatTileName(locked)} at ${xy(r, c)} must touch a House, and ${xy(target.r, target.c)} is its only valid neighbor${otherWhy}.`,
                true,
                customSteps
              );
            }
          } else if (houseNeighbors.length > 1) {
            const spotsLabel = houseNeighbors
              .map((n) => xy(n.r, n.c))
              .join(' or ');
            const sharedRow = houseNeighbors.every(
              (n) => n.r === houseNeighbors[0].r
            )
              ? houseNeighbors[0].r
              : -1;
            const sharedCol = houseNeighbors.every(
              (n) => n.c === houseNeighbors[0].c
            )
              ? houseNeighbors[0].c
              : -1;

            if (sharedRow !== -1) {
              for (let cc = 0; cc < size; cc++) {
                if (
                  !houseNeighbors.some((n) => n.c === cc) &&
                  domains[sharedRow][cc].has('house')
                ) {
                  const prev = domains[sharedRow][cc].size;
                  domains[sharedRow][cc].delete('house');
                  const elimReason: EliminationReason = {
                    type: 'POINTING_LINE',
                    axis: 'row',
                    index: sharedRow,
                    buildingType: 'house',
                    spotsLabel,
                    sourceCoord: { r, c },
                    sourceType: locked
                  };
                  recordElimReason(sharedRow, cc, 'house', elimReason);
                  progress = true;
                  recordLockIfNew(
                    sharedRow,
                    cc,
                    prev,
                    'Row House Claimed',
                    formatEliminationReason(sharedRow, cc, 'house', elimReason)
                  );
                }
              }
            }
            if (sharedCol !== -1) {
              for (let rr = 0; rr < size; rr++) {
                if (
                  !houseNeighbors.some((n) => n.r === rr) &&
                  domains[rr][sharedCol].has('house')
                ) {
                  const prev = domains[rr][sharedCol].size;
                  domains[rr][sharedCol].delete('house');
                  const elimReason: EliminationReason = {
                    type: 'POINTING_LINE',
                    axis: 'col',
                    index: sharedCol,
                    buildingType: 'house',
                    spotsLabel,
                    sourceCoord: { r, c },
                    sourceType: locked
                  };
                  recordElimReason(rr, sharedCol, 'house', elimReason);
                  progress = true;
                  recordLockIfNew(
                    rr,
                    sharedCol,
                    prev,
                    'Column House Claimed',
                    formatEliminationReason(rr, sharedCol, 'house', elimReason)
                  );
                }
              }
            }
          }
        }

        if (locked === 'house') {
          if (startingGrid && startingGrid[r][c] !== 'house') {
            continue;
          }

          const partnerNeighbors = ortho.filter(
            (n) =>
              domains[n.r][n.c].has('woodcutter') ||
              domains[n.r][n.c].has('farm')
          );
          if (partnerNeighbors.length === 1) {
            const target = partnerNeighbors[0];
            const dom = domains[target.r][target.c];
            const prev = dom.size;
            let modified = false;
            const elimReason: EliminationReason = {
              type: 'PARTNER_FORCED',
              sourceCoord: { r, c },
              sourceType: 'house',
              allowedTypes: ['woodcutter', 'farm']
            };
            for (const t of Array.from(dom)) {
              if (t !== 'woodcutter' && t !== 'farm') {
                dom.delete(t);
                recordElimReason(
                  target.r,
                  target.c,
                  t,
                  elimReason
                );
                modified = true;
              }
            }
            if (modified) {
              progress = true;
              recordLockIfNew(
                target.r,
                target.c,
                prev,
                'House Needs Partner',
                `The House at ${xy(r, c)} must touch a Woodcutter or Farm, so ${xy(target.r, target.c)} must be one.`
              );
            }
          }
        }

        // 6c. Any cell that must be a building (Farm/House) needs an adjacent partner building
        if (mustBeBuilding(domains[r][c])) {
          const canBeWc =
            domains[r][c].has('woodcutter') &&
            ortho.some((n) => domains[n.r][n.c].has('tree'));
          const canBeTH = domains[r][c].has('town_hall');
          if (!canBeWc && !canBeTH) {
            // (r, c) must be Farm or House, both of which require an adjacent building!
            const partnerNeighbors = ortho.filter((n) =>
              canBeAnyBuilding(domains[n.r][n.c])
            );
            if (partnerNeighbors.length === 1) {
              const target = partnerNeighbors[0];
              const dom = domains[target.r][target.c];
              if (!mustBeBuilding(dom)) {
                const prev = dom.size;
                const remEmpty = dom.delete('empty');
                const remRoad = dom.delete('road');
                if (remEmpty || remRoad) {
                  progress = true;
                  const elimReason: EliminationReason = {
                    type: 'BUILDING_PARTNER_REQUIRED',
                    sourceCoord: { r, c }
                  };
                  recordElimReason(target.r, target.c, 'empty', elimReason);
                  recordElimReason(target.r, target.c, 'road', elimReason);
                  recordLockIfNew(
                    target.r,
                    target.c,
                    prev,
                    'Building Partner Required',
                    `The building at ${xy(r, c)} requires an adjacent partner building, and ${xy(target.r, target.c)} is its only available neighbor.`,
                    false
                  );
                }
              }
            }
          }
        }

        if (
          hasTownHall &&
          (locked === 'woodcutter' ||
            locked === 'farm' ||
            locked === 'town_hall')
        ) {
          if (startingGrid && startingGrid[r][c] !== locked) {
            continue;
          }

          const roadNeighbors = ortho.filter((n) =>
            domains[n.r][n.c].has('road')
          );
          if (roadNeighbors.length === 1) {
            const target = roadNeighbors[0];
            const dom = domains[target.r][target.c];
            if (dom.size > 1) {
              const prev = dom.size;
              dom.clear();
              dom.add('road');
              progress = true;
              const otherWhy = explainWhyOtherOrthoNeighborsWereRuledOut(
                r,
                c,
                target,
                'road'
              );
              const otherEmpty = ortho.filter(
                (n) =>
                  (n.r !== target.r || n.c !== target.c) &&
                  !isFixedObstacle(level.initialGrid[n.r][n.c]) &&
                  (!startingGrid || startingGrid[n.r][n.c] === 'empty')
              );
              const connTarget =
                locked === 'town_hall' ? 'connect to the village' : 'reach the Town Hall';
              const customSteps: HintStep[] = [
                {
                  title: 'Road Entry Point',
                  message: `The ${formatTileName(locked)} at ${xy(r, c)} needs a Road connection to ${connTarget}.`,
                  focusCells: [{ r, c }],
                  candidateCells: [target, ...otherEmpty]
                }
              ];
              for (const n of otherEmpty) {
                const reasonObj =
                  cellElimReasons[`${n.r},${n.c}`]?.['road'] ??
                  cellElimReasons[`${n.r},${n.c}`]?.['empty'];
                const reason = reasonObj
                  ? formatEliminationReason(n.r, n.c, 'road', reasonObj)
                  : undefined;
                customSteps.push({
                  title: 'Road Entry Point',
                  message: reason
                    ? `${xy(n.r, n.c)} cannot be a Road (${reason}).`
                    : `${xy(n.r, n.c)} cannot be a Road.`,
                  focusCells: [{ r, c }],
                  discardedCells: [n]
                });
              }
              customSteps.push({
                title: 'Road Entry Point',
                message:
                  otherEmpty.length > 0
                    ? `That leaves ${xy(target.r, target.c)} as the only available Road exit for the ${formatTileName(locked)} at ${xy(r, c)}!`
                    : `${xy(target.r, target.c)} is the only adjacent spot next to the ${formatTileName(locked)} at ${xy(r, c)} for a Road.`,
                focusCells: [{ r, c }],
                targetCell: target
              });

              recordLockIfNew(
                target.r,
                target.c,
                prev,
                'Road Entry Point',
                `The ${formatTileName(locked)} at ${xy(r, c)} needs a Road connection, and ${xy(target.r, target.c)} is its only available exit${otherWhy}.`,
                true,
                customSteps
              );
            }
          }
        }
      }
    }

    // --- RULE 5.5: Row & Column Full Building Forcing ---
    for (let r = 0; r < size; r++) {
      const buildingCandidates: number[] = [];
      for (let c = 0; c < size; c++) {
        if (canBeAnyBuilding(domains[r][c])) buildingCandidates.push(c);
      }
      let placedInRow = 0;
      for (let c = 0; c < size; c++) {
        if (isBuilding(currentBoardGrid[r][c]) || currentBoardBuildingMarks[r][c]) {
          placedInRow++;
        }
      }
      const quota = level.rowClues[r];
      const remainingNeeded = quota - placedInRow;

      if (remainingNeeded > 0) {
        const openCandidates = buildingCandidates.filter(
          (c) =>
            !isBuilding(currentBoardGrid[r][c]) &&
            !currentBoardBuildingMarks[r][c]
        );
        if (openCandidates.length === remainingNeeded) {
          const needText =
            placedInRow > 0
              ? remainingNeeded === 1
                ? `Row ${r + 1} needs 1 more building`
                : `Row ${r + 1} needs ${remainingNeeded} more buildings`
              : quota === 1
                ? `Row ${r + 1} needs 1 building`
                : `Row ${r + 1} needs ${quota} buildings`;

          const spotText =
            openCandidates.length === 1
              ? `${xy(r, openCandidates[0])} is its only valid spot`
              : `only ${openCandidates.map((cc) => xy(r, cc)).join(' and ')} can hold buildings`;

          // Check if any disqualified cell in this line should be explained first
          let foundDisqualifiedCell = false;
          for (let c = 0; c < size; c++) {
            const isObstacle = isFixedObstacle(level.initialGrid[r][c]);
            const isPlaced = currentBoardGrid[r][c] !== 'empty';
            const isMarked = playerMarks && playerMarks[r][c];
            if (!isObstacle && !isPlaced && !isMarked && !openCandidates.includes(c) && !canBeAnyBuilding(domains[r][c])) {
              const cellKey = `${r},${c}`;
              if (!recordedDisqualifiedCells.has(cellKey)) {
                recordedDisqualifiedCells.add(cellKey);
                foundDisqualifiedCell = true;
                const thReason = cellElimReasons[cellKey]?.['town_hall'];
                if (
                  thReason?.type === 'CONTRADICTION' &&
                  (thReason.contradiction.includes('forcing') || thReason.contradiction.includes('which causes'))
                ) {
                  const basicReasons: string[] = [];
                  if (cellElimReasons[cellKey]?.['woodcutter']) {
                    basicReasons.push(formatEliminationReason(r, c, 'woodcutter', cellElimReasons[cellKey]!['woodcutter']!));
                  }
                  const hReason = cellElimReasons[cellKey]?.['house'];
                  const fReason = cellElimReasons[cellKey]?.['farm'];
                  if (hReason?.type === 'LINE_LIMIT_EXCEEDED') {
                    basicReasons.push(formatEliminationReason(r, c, 'house', hReason));
                  } else if (fReason?.type === 'LINE_LIMIT_EXCEEDED') {
                    basicReasons.push(formatEliminationReason(r, c, 'farm', fReason));
                  } else if (hReason || fReason) {
                    basicReasons.push('no partner for House/Farm');
                  }
                  const basicText = basicReasons.join(', ');

                  const highlightCells: Coord[] = [{ r, c }];
                  const allMatches = thReason.contradiction.matchAll(/\((\d+),\s*(\d+)\)/g);
                  for (const m of allMatches) {
                    const targetCoord = {
                      r: parseInt(m[2], 10) - 1,
                      c: parseInt(m[1], 10) - 1
                    };
                    if (!highlightCells.some((h) => h.r === targetCoord.r && h.c === targetCoord.c)) {
                      highlightCells.push(targetCoord);
                    }
                  }

                  steps.push({
                    r,
                    c,
                    action: 'mark_empty',
                    ruleName: 'Cannot Hold Building',
                    explanation: `${xy(r, c)} cannot hold a building. Mark ${xy(r, c)} as clear ground.`,
                    steps: [
                      {
                        title: 'Cannot Hold Building',
                        message: `${xy(r, c)} cannot hold a Woodcutter, Farm, or House: ${basicText}.`,
                        focusCells: [{ r, c }],
                        discardedCells: [{ r, c }]
                      },
                      {
                        title: 'Cannot Hold Building',
                        message: `Town Hall at ${xy(r, c)} would ${thReason.contradiction}.`,
                        focusCells: [{ r, c }],
                        candidateCells: highlightCells
                      },
                      {
                        title: 'Cannot Hold Building',
                        message: `Since no building type can fit at ${xy(r, c)}, mark it as clear ground.`,
                        focusCells: [{ r, c }],
                        targetCell: { r, c }
                      }
                    ]
                  });
                } else {
                  const reasons = cellElimReasons[cellKey] ?? {};
                  const points = getDetailedCellDisqualificationPoints(r, c, reasons, level);
                  steps.push({
                    r,
                    c,
                    action: 'mark_empty',
                    ruleName: 'Cannot Hold Building',
                    explanation: `No village buildings can be placed at ${xy(r, c)} (${points.join('; ')}), so this space must be marked as clear ground.`,
                    steps: [
                      {
                        title: 'Cannot Hold Building',
                        message:
                          `No village buildings can be placed at ${xy(r, c)}:\n` +
                          points.map((p) => `• ${p}`).join('\n'),
                        focusCells: [{ r, c }],
                        candidateCells: [{ r, c }],
                        discardedCells: [{ r, c }]
                      },
                      {
                        title: 'Mark as Clear Ground',
                        message: `Since no buildings can fit at ${xy(r, c)}, mark it as clear ground.`,
                        targetCell: { r, c }
                      }
                    ]
                  });
                }
                progress = true;
                break;
              }
            }
          }
          if (foundDisqualifiedCell) {
            break;
          }

          const reason: EliminationReason = {
            type: 'LINE_MUST_BE_FILLED',
            axis: 'row',
            index: r,
            needed: remainingNeeded,
            spotText,
            discText: ''
          };

          for (const c of openCandidates) {
            const prev = domains[r][c].size;
            const removedEmpty = domains[r][c].delete('empty');
            const removedRoad = domains[r][c].delete('road');
            if (removedEmpty || removedRoad) {
              progress = true;
              recordElimReason(r, c, 'empty', reason);
              recordElimReason(r, c, 'road', reason);

              if (domains[r][c].size === 1) {
                const locked = getLockedTile(domains[r][c])!;
                currentBoardGrid[r][c] = locked;
                recordLockIfNew(
                  r,
                  c,
                  prev,
                  quota === 1 ? 'Row Needs Building' : 'Row Full Building Forcing',
                  `${needText}, and ${spotText}`,
                  false
                );
              } else {
                currentBoardBuildingMarks[r][c] = true;
                const cellKey = `${r},${c}`;
                if (!recordedMarkedBuildingCells.has(cellKey)) {
                  recordedMarkedBuildingCells.add(cellKey);
                  const ruleName = 'Row Needs Building';
                  steps.push({
                    r,
                    c,
                    action: 'mark_building',
                    ruleName,
                    explanation: `${needText}, and ${spotText}. Mark ${xy(r, c)} as a Building.`,
                    steps: [
                      {
                        title: ruleName,
                        message: `${needText}, and ${spotText}.`,
                        highlightLine: { axis: 'row', index: r },
                        focusCells: [{ r, c }],
                        candidateCells: openCandidates.map((cc) => ({ r, c: cc }))
                      },
                      {
                        title: ruleName,
                        message: `${xy(r, c)} must contain a building! Mark it as a Building foundation.`,
                        highlightLine: { axis: 'row', index: r },
                        focusCells: [{ r, c }],
                        targetCell: { r, c }
                      }
                    ]
                  });
                }
              }
            }
          }
        }
      }
    }

    for (let c = 0; c < size; c++) {
      const buildingCandidates: number[] = [];
      for (let r = 0; r < size; r++) {
        if (canBeAnyBuilding(domains[r][c])) buildingCandidates.push(r);
      }
      let placedInCol = 0;
      for (let r = 0; r < size; r++) {
        if (isBuilding(currentBoardGrid[r][c]) || currentBoardBuildingMarks[r][c]) {
          placedInCol++;
        }
      }
      const quota = level.colClues[c];
      const remainingNeeded = quota - placedInCol;

      if (remainingNeeded > 0) {
        const openCandidates = buildingCandidates.filter(
          (r) =>
            !isBuilding(currentBoardGrid[r][c]) &&
            !currentBoardBuildingMarks[r][c]
        );
        if (openCandidates.length === remainingNeeded) {
          const needText =
            placedInCol > 0
              ? remainingNeeded === 1
                ? `Column ${c + 1} needs 1 more building`
                : `Column ${c + 1} needs ${remainingNeeded} more buildings`
              : quota === 1
                ? `Column ${c + 1} needs 1 building`
                : `Column ${c + 1} needs ${quota} buildings`;

          const spotText =
            openCandidates.length === 1
              ? `${xy(openCandidates[0], c)} is its only valid spot`
              : `only ${openCandidates.map((rr) => xy(rr, c)).join(' and ')} can hold buildings`;

          // Check if any disqualified cell in this line should be explained first
          let foundDisqualifiedCell = false;
          for (let r = 0; r < size; r++) {
            const isObstacle = isFixedObstacle(level.initialGrid[r][c]);
            const isPlaced = currentBoardGrid[r][c] !== 'empty';
            const isMarked = playerMarks && playerMarks[r][c];
            if (!isObstacle && !isPlaced && !isMarked && !openCandidates.includes(r) && !canBeAnyBuilding(domains[r][c])) {
              const cellKey = `${r},${c}`;
              if (!recordedDisqualifiedCells.has(cellKey)) {
                recordedDisqualifiedCells.add(cellKey);
                foundDisqualifiedCell = true;
                const thReason = cellElimReasons[cellKey]?.['town_hall'];
                if (
                  thReason?.type === 'CONTRADICTION' &&
                  (thReason.contradiction.includes('forcing') || thReason.contradiction.includes('which causes'))
                ) {
                  const basicReasons: string[] = [];
                  if (cellElimReasons[cellKey]?.['woodcutter']) {
                    basicReasons.push(formatEliminationReason(r, c, 'woodcutter', cellElimReasons[cellKey]!['woodcutter']!));
                  }
                  const hReason = cellElimReasons[cellKey]?.['house'];
                  const fReason = cellElimReasons[cellKey]?.['farm'];
                  if (hReason?.type === 'LINE_LIMIT_EXCEEDED') {
                    basicReasons.push(formatEliminationReason(r, c, 'house', hReason));
                  } else if (fReason?.type === 'LINE_LIMIT_EXCEEDED') {
                    basicReasons.push(formatEliminationReason(r, c, 'farm', fReason));
                  } else if (hReason || fReason) {
                    basicReasons.push('no partner for House/Farm');
                  }
                  const basicText = basicReasons.join(', ');

                  const highlightCells: Coord[] = [{ r, c }];
                  const allMatches = thReason.contradiction.matchAll(/\((\d+),\s*(\d+)\)/g);
                  for (const m of allMatches) {
                    const targetCoord = {
                      r: parseInt(m[2], 10) - 1,
                      c: parseInt(m[1], 10) - 1
                    };
                    if (!highlightCells.some((h) => h.r === targetCoord.r && h.c === targetCoord.c)) {
                      highlightCells.push(targetCoord);
                    }
                  }

                  steps.push({
                    r,
                    c,
                    action: 'mark_empty',
                    ruleName: 'Cannot Hold Building',
                    explanation: `${xy(r, c)} cannot hold a building. Mark ${xy(r, c)} as clear ground.`,
                    steps: [
                      {
                        title: 'Cannot Hold Building',
                        message: `${xy(r, c)} cannot hold a Woodcutter, Farm, or House: ${basicText}.`,
                        focusCells: [{ r, c }],
                        discardedCells: [{ r, c }]
                      },
                      {
                        title: 'Cannot Hold Building',
                        message: `Town Hall at ${xy(r, c)} would ${thReason.contradiction}.`,
                        focusCells: [{ r, c }],
                        candidateCells: highlightCells
                      },
                      {
                        title: 'Cannot Hold Building',
                        message: `Since no building type can fit at ${xy(r, c)}, mark it as clear ground.`,
                        focusCells: [{ r, c }],
                        targetCell: { r, c }
                      }
                    ]
                  });
                } else {
                  const reasons = cellElimReasons[cellKey] ?? {};
                  const points = getDetailedCellDisqualificationPoints(r, c, reasons, level);
                  steps.push({
                    r,
                    c,
                    action: 'mark_empty',
                    ruleName: 'Cannot Hold Building',
                    explanation: `No village buildings can be placed at ${xy(r, c)} (${points.join('; ')}), so this space must be marked as clear ground.`,
                    steps: [
                      {
                        title: 'Cannot Hold Building',
                        message:
                          `No village buildings can be placed at ${xy(r, c)}:\n` +
                          points.map((p) => `• ${p}`).join('\n'),
                        focusCells: [{ r, c }],
                        candidateCells: [{ r, c }],
                        discardedCells: [{ r, c }]
                      },
                      {
                        title: 'Mark as Clear Ground',
                        message: `Since no buildings can fit at ${xy(r, c)}, mark it as clear ground.`,
                        targetCell: { r, c }
                      }
                    ]
                  });
                }
                progress = true;
                break;
              }
            }
          }
          if (foundDisqualifiedCell) {
            break;
          }

          const reason: EliminationReason = {
            type: 'LINE_MUST_BE_FILLED',
            axis: 'col',
            index: c,
            needed: remainingNeeded,
            spotText,
            discText: ''
          };

          for (const r of openCandidates) {
            const prev = domains[r][c].size;
            const removedEmpty = domains[r][c].delete('empty');
            const removedRoad = domains[r][c].delete('road');
            if (removedEmpty || removedRoad) {
              progress = true;
              recordElimReason(r, c, 'empty', reason);
              recordElimReason(r, c, 'road', reason);

              if (domains[r][c].size === 1) {
                const locked = getLockedTile(domains[r][c])!;
                currentBoardGrid[r][c] = locked;
                recordLockIfNew(
                  r,
                  c,
                  prev,
                  quota === 1 ? 'Column Needs Building' : 'Column Full Building Forcing',
                  `${needText}, and ${spotText}`,
                  false
                );
              } else {
                currentBoardBuildingMarks[r][c] = true;
                const cellKey = `${r},${c}`;
                if (!recordedMarkedBuildingCells.has(cellKey)) {
                  recordedMarkedBuildingCells.add(cellKey);
                  const ruleName = 'Column Needs Building';
                  steps.push({
                    r,
                    c,
                    action: 'mark_building',
                    ruleName,
                    explanation: `${needText}, and ${spotText}. Mark ${xy(r, c)} as a Building.`,
                    steps: [
                      {
                        title: ruleName,
                        message: `${needText}, and ${spotText}.`,
                        highlightLine: { axis: 'col', index: c },
                        focusCells: [{ r, c }],
                        candidateCells: openCandidates.map((rr) => ({ r: rr, c }))
                      },
                      {
                        title: ruleName,
                        message: `${xy(r, c)} must contain a building! Mark it as a Building foundation.`,
                        highlightLine: { axis: 'col', index: c },
                        focusCells: [{ r, c }],
                        targetCell: { r, c }
                      }
                    ]
                  });
                }
              }
            }
          }
        }
      }
    }

    // --- RULE 6: Inventory Exhaustion & Hidden Singles ---
    for (const pType of PLACEABLE_TYPES) {
      const targetCount = level.inventory[pType];
      if (targetCount === 0) continue;

      const confirmedCells: Coord[] = [];
      const candidateCells: Coord[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (getLockedTile(domains[r][c]) === pType) {
            confirmedCells.push({ r, c });
          }
          if (domains[r][c].has(pType)) {
            candidateCells.push({ r, c });
          }
        }
      }

      if (confirmedCells.length === targetCount) {
        for (const cell of candidateCells) {
          if (getLockedTile(domains[cell.r][cell.c]) !== pType) {
            const prev = domains[cell.r][cell.c].size;
            domains[cell.r][cell.c].delete(pType);
            const elimReason: EliminationReason = {
              type: 'INVENTORY_EXHAUSTED',
              tileType: pType,
              count: targetCount
            };
            recordElimReason(
              cell.r,
              cell.c,
              pType,
              elimReason
            );
            progress = true;
            recordLockIfNew(
              cell.r,
              cell.c,
              prev,
              'Inventory Complete',
              `All ${targetCount} ${formatTileName(pType)} tile(s) have already been placed.`
            );
          }
        }
      }

      if (candidateCells.length === targetCount) {
        for (const cell of candidateCells) {
          const dom = domains[cell.r][cell.c];
          if (dom.size > 1) {
            const prev = dom.size;
            dom.clear();
            dom.add(pType);
            progress = true;
            recordLockIfNew(
              cell.r,
              cell.c,
              prev,
              'Only Remaining Spot',
              `${xy(cell.r, cell.c)} is the only remaining valid spot on the board for the required ${formatTileName(pType)}.`,
              true
            );
          }
        }
      }
    }

    // --- RULE 7: Road Distance & Unique Road Network Deduction ---
    if (hasTownHall) {
      const thCandidates: Coord[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (domains[r][c].has('town_hall')) thCandidates.push({ r, c });
        }
      }

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          for (const bType of ['woodcutter', 'farm'] as const) {
            if (!domains[r][c].has(bType)) continue;
            const canReachAnyTH = thCandidates.some(
              (th) =>
                shortestPossibleRoadDistance(domains, r, c, th.r, th.c) <=
                maxRoads
            );
            if (!canReachAnyTH) {
              const prev = domains[r][c].size;
              domains[r][c].delete(bType);
              const elimReason: EliminationReason = {
                type: 'TOO_FAR_FROM_TOWN_HALL',
                maxRoads
              };
              recordElimReason(r, c, bType, elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Road Distance Limit',
                `A ${formatTileName(bType)} at ${xy(r, c)} cannot reach the Town Hall within ${maxRoads} Road tile(s).`
              );
            }
          }
        }
      }

      if (!progress) {
        const placedSources: { r: number; c: number; type: TileType }[] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const isRoad =
              (domains[r][c].size === 1 && domains[r][c].has('road')) ||
              (startingGrid && startingGrid[r][c] === 'road');
            if (isRoad) {
              placedSources.push({ r, c, type: 'road' });
            } else if (
              startingGrid &&
              (startingGrid[r][c] === 'woodcutter' ||
                startingGrid[r][c] === 'farm')
            ) {
              placedSources.push({ r, c, type: startingGrid[r][c] });
            }
          }
        }

        bottleneckLoop: for (const src of placedSources) {
          const touchesTH = thCandidates.some(
            (th) =>
              (src.r === th.r && src.c === th.c) ||
              Math.abs(src.r - th.r) + Math.abs(src.c - th.c) === 1
          );
          if (touchesTH) continue;

          const ortho = getOrthoNeighbors(size, src.r, src.c);
          const roadNeighbors = ortho.filter(
            (n) => domains[n.r][n.c].has('road') && domains[n.r][n.c].size > 1
          );

          for (const cand of roadNeighbors) {
            const q: Coord[] = [{ r: src.r, c: src.c }];
            const visited = new Set<string>([`${src.r},${src.c}`]);
            let canReachTH = false;

            while (q.length > 0) {
              const curr = q.shift()!;
              for (const th of thCandidates) {
                if (
                  (curr.r === th.r && curr.c === th.c) ||
                  Math.abs(curr.r - th.r) + Math.abs(curr.c - th.c) === 1
                ) {
                  canReachTH = true;
                  break;
                }
              }
              if (canReachTH) break;

              for (const n of getOrthoNeighbors(size, curr.r, curr.c)) {
                if (n.r === cand.r && n.c === cand.c) continue;
                const nKey = `${n.r},${n.c}`;
                if (visited.has(nKey)) continue;

                if (domains[n.r][n.c].has('road')) {
                  visited.add(nKey);
                  q.push(n);
                }
              }
            }

            if (!canReachTH) {
              const prev = domains[cand.r][cand.c].size;
              domains[cand.r][cand.c].clear();
              domains[cand.r][cand.c].add('road');
              progress = true;

              const otherNeighbors = roadNeighbors.filter(
                (n) => n.r !== cand.r || n.c !== cand.c
              );
              const customSteps: HintStep[] = [
                {
                  title: 'Road Connection Required',
                  message: `The ${formatTileName(src.type)} at ${xy(src.r, src.c)} needs a Road connection to reach the Town Hall.`,
                  focusCells: [{ r: src.r, c: src.c }],
                  candidateCells: [cand, ...otherNeighbors]
                },
                {
                  title: 'Required Road Path',
                  message:
                    otherNeighbors.length > 0
                      ? `Any other path out of this corner is blocked or leads to a dead end. Every valid path to the Town Hall must pass through ${xy(cand.r, cand.c)}.`
                      : `Every valid path connecting to the Town Hall must pass through ${xy(cand.r, cand.c)}.`,
                  focusCells: [{ r: src.r, c: src.c }, cand],
                  discardedCells: otherNeighbors
                },
                {
                  title: 'Place Road',
                  message: `Place a Road at ${xy(cand.r, cand.c)} to maintain connection to the rest of the village.`,
                  focusCells: [{ r: src.r, c: src.c }],
                  targetCell: cand
                }
              ];

              recordLockIfNew(
                cand.r,
                cand.c,
                prev,
                'Required Road Path',
                `The ${formatTileName(src.type)} at ${xy(src.r, src.c)} must connect to the Town Hall, and every valid path must pass through ${xy(cand.r, cand.c)}.`,
                true,
                customSteps
              );
              break bottleneckLoop;
            }
          }
        }
      }

      let allBuildingsLocked = true;
      for (const b of BUILDING_TYPES) {
        let count = 0;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (getLockedTile(domains[r][c]) === b) count++;
          }
        }
        if (count !== level.inventory[b]) {
          allBuildingsLocked = false;
          break;
        }
      }

      if (allBuildingsLocked) {
        const partialGrid: TileType[][] = domains.map((row) =>
          row.map((d) => {
            const locked = getLockedTile(d);
            if (locked && locked !== 'road') return locked;
            return 'empty';
          })
        );
        const validNetworks = findValidRoadNetworksForBuildings(
          partialGrid,
          maxRoads,
          4
        ).filter((net) => {
          const netSet = new Set(net.map((c) => `${c.r},${c.c}`));
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const key = `${r},${c}`;
              if (netSet.has(key) && !domains[r][c].has('road')) return false;
              if (!netSet.has(key) && getLockedTile(domains[r][c]) === 'road') {
                return false;
              }
            }
          }
          return true;
        });

        if (validNetworks.length > 0) {
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (domains[r][c].size <= 1) continue;
              const inAll = validNetworks.every((net) =>
                net.some((cell) => cell.r === r && cell.c === c)
              );
              const inNone = validNetworks.every(
                (net) => !net.some((cell) => cell.r === r && cell.c === c)
              );
              if (inAll && domains[r][c].has('road')) {
                const prev = domains[r][c].size;
                domains[r][c].clear();
                domains[r][c].add('road');
                progress = true;
                recordLockIfNew(
                  r,
                  c,
                  prev,
                  'Required Road Path',
                  `${xy(r, c)} is required to connect the village buildings to the Town Hall within ${maxRoads} Road tile(s).`,
                  true
                );
              } else if (inNone && domains[r][c].has('road')) {
                const prev = domains[r][c].size;
                domains[r][c].delete('road');
                const elimReason: EliminationReason = {
                  type: 'NOT_ON_ROAD_PATH'
                };
                recordElimReason(r, c, 'road', elimReason);
                progress = true;
                recordLockIfNew(
                  r,
                  c,
                  prev,
                  'Unneeded for Road Path',
                  `${xy(r, c)} is not part of the ${maxRoads}-tile Road path to the Town Hall.`,
                  true
                );
              }
            }
          }
        }
      }
    }

    // --- RULE 7.5: Mark Cells Where No Buildings Fit ---
    // Before falling back to multi-step proof-by-contradiction lookahead,
    // check if any unplaced, unmarked cells have had all village building types eliminated.
    // If so, prompt the player to mark that cell as clear ground (Grass),
    // which simplifies the board and often reveals direct line-filling placements naturally!
    if (!progress) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cellKey = `${r},${c}`;
          const isObstacle = isFixedObstacle(level.initialGrid[r][c]);
          const isPlaced = startingGrid && startingGrid[r][c] !== 'empty';
          const isMarked = playerMarks && playerMarks[r][c];
          if (
            !isObstacle &&
            !isPlaced &&
            !isMarked &&
            domains[r][c].size > 1 &&
            !recordedDisqualifiedCells.has(cellKey)
          ) {
            if (!canBeAnyBuilding(domains[r][c])) {
              recordedDisqualifiedCells.add(cellKey);
              const reasons = cellElimReasons[cellKey] ?? {};
              const points = getDetailedCellDisqualificationPoints(r, c, reasons, level);
              const ruleName = 'No Buildings Fit';
              const explanation = `No village buildings can be placed at ${xy(r, c)} (${points.join('; ')}), so this space must be marked as clear ground (Grass).`;

              steps.push({
                r,
                c,
                action: 'mark_empty',
                ruleName,
                explanation,
                steps: [
                  {
                    title: 'No Buildings Fit',
                    message:
                      `No village buildings can be placed at ${xy(r, c)}:\n` +
                      points.map((p) => `• ${p}`).join('\n'),
                    focusCells: [{ r, c }],
                    candidateCells: [{ r, c }],
                    discardedCells: [{ r, c }]
                  },
                  {
                    title: 'Mark as Clear Ground',
                    message: `Since no buildings can fit at ${xy(r, c)}, this space must be marked as clear ground (Grass).`,
                    targetCell: { r, c }
                  }
                ]
              });
              progress = true;
              break;
            }
          }
        }
        if (progress) break;
      }
    }

    // --- RULE 7.8: Generic Building Foundation Deduction ---
    // If no concrete tile was locked to size 1, but we know a cell must contain a building,
    // prompt the player to mark it as a Building foundation!
    if (!progress) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const isObstacle = isFixedObstacle(level.initialGrid[r][c]);
          const isPlaced = startingGrid && startingGrid[r][c] !== 'empty';
          const isMarkedBuilding = playerBuildingMarks && playerBuildingMarks[r][c];

          const cellKey = `${r},${c}`;
          if (
            !isObstacle &&
            !isPlaced &&
            !isMarkedBuilding &&
            domains[r][c].size > 1 &&
            !recordedMarkedBuildingCells.has(cellKey) &&
            mustBeBuilding(domains[r][c])
          ) {
            recordedMarkedBuildingCells.add(cellKey);
            currentBoardBuildingMarks[r][c] = true;
            const emptyReasonObj = cellElimReasons[cellKey]?.['empty'];
            const emptyReason = emptyReasonObj
              ? formatEliminationReason(r, c, 'empty', emptyReasonObj)
              : 'quota requirements force a building here';

            let ruleName = 'Building Foundation';
            let axis: { axis: 'row' | 'col'; index: number } | undefined = undefined;
            if (emptyReasonObj && typeof emptyReasonObj !== 'string') {
              if (emptyReasonObj.type === 'LINE_MUST_BE_FILLED') {
                ruleName =
                  emptyReasonObj.axis === 'row'
                    ? 'Row Needs Building'
                    : 'Column Needs Building';
                axis = { axis: emptyReasonObj.axis, index: emptyReasonObj.index };
              }
            } else {
              if (emptyReason.includes('Column')) {
                ruleName = 'Column Needs Building';
                axis = { axis: 'col', index: c };
              } else if (emptyReason.includes('Row')) {
                ruleName = 'Row Needs Building';
                axis = { axis: 'row', index: r };
              }
            }

            steps.push({
              r,
              c,
              action: 'mark_building',
              ruleName,
              explanation: `${emptyReason}. Mark ${xy(r, c)} as a Building.`,
              steps: [
                {
                  title: ruleName,
                  message: `${emptyReason}.`,
                  highlightLine: axis,
                  focusCells: [{ r, c }],
                  candidateCells: [{ r, c }]
                },
                {
                  title: ruleName,
                  message: `${xy(r, c)} must contain a building! Mark it as a Building foundation.`,
                  highlightLine: axis,
                  focusCells: [{ r, c }],
                  targetCell: { r, c }
                }
              ]
            });
            progress = true;
            break;
          }
        }
        if (progress) break;
      }
    }

    // --- RULE 8: Specific Contradiction Lookahead ---
    if (!progress) {
      outerLookahead: for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (domains[r][c].size <= 1) continue;
          for (const candidate of Array.from(domains[r][c])) {
            const contradiction = findSpecificAssignmentContradiction(
              domains,
              level,
              r,
              c,
              candidate
            );
            if (contradiction !== null) {
              lookaheadCount++;
              const prev = domains[r][c].size;
              domains[r][c].delete(candidate);
              lookaheadEliminatedCells.add(`${r},${c}`);
              const elimReason: EliminationReason = {
                type: 'CONTRADICTION',
                contradiction
              };
              recordElimReason(r, c, candidate, elimReason);
              progress = true;
              recordLockIfNew(
                r,
                c,
                prev,
                'Logical Elimination',
                candidate === 'empty'
                  ? `${xy(r, c)} cannot be empty because ${contradiction}.`
                  : `${xy(r, c)} cannot be ${formatTileName(candidate)} because ${contradiction}.`,
                false
              );
              break outerLookahead;
            }
          }
        }
      }
    }
  }

  const solved = domains.every((row) => row.every((dom) => dom.size === 1));

  return {
    solved,
    steps,
    finalDomains: domains,
    lookaheadCount
  };
}

/**
 * Tests if setting (testR, testC) = candidate leads to a direct logical contradiction,
 * and returns a specific, human-readable explanation of WHICH rule breaks (or null if consistent).
 */
function findSpecificAssignmentContradiction(
  baseDomains: Set<TileType>[][],
  level: LevelDefinition,
  testR: number,
  testC: number,
  candidate: TileType
): string | null {
  const size = level.size;
  const domains: Set<TileType>[][] = baseDomains.map((row) =>
    row.map((s) => new Set(s))
  );
  domains[testR][testC] = new Set([candidate]);

  interface ForcedStep {
    text: string;
    targetR: number;
    targetC: number;
  }
  const forcedSteps: ForcedStep[] = [];
  let changed = true;
  while (changed) {
    changed = false;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (domains[r][c].size === 0) {
          return `${xy(r, c)} would have no valid tile options left`;
        }
      }
    }

    // Row building count bounds
    for (let r = 0; r < size; r++) {
      let minB = 0;
      let maxB = 0;
      for (let c = 0; c < size; c++) {
        if (mustBeBuilding(domains[r][c])) minB++;
        if (canBeAnyBuilding(domains[r][c])) maxB++;
      }
      if (minB > level.rowClues[r]) {
        const relevant = forcedSteps.filter((s) => s.targetR === r);
        const stepsToUse = relevant.length > 0 ? relevant : forcedSteps;
        if (stepsToUse.length > 0) {
          const fillCol =
            candidate === 'town_hall' || isBuilding(candidate)
              ? `fill Column ${testC + 1}, `
              : '';
          const otherMustCols: number[] = [];
          for (let cc = 0; cc < size; cc++) {
            if (
              mustBeBuilding(domains[r][cc]) &&
              !stepsToUse.some((s) => s.targetC === cc && s.targetR === r)
            ) {
              otherMustCols.push(cc);
            }
          }
          if (otherMustCols.length > 0) {
            const names = otherMustCols.map((cc) => {
              const alreadyLocked = getLockedTile(baseDomains[r][cc]);
              if (alreadyLocked && isBuilding(alreadyLocked)) {
                return `${formatTileName(alreadyLocked)} at ${xy(r, cc)}`;
              }
              return `${xy(r, cc)} (needed for Column ${cc + 1})`;
            });
            return `${fillCol}${stepsToUse.map((s) => s.text).join(', ')}. Along with ${names.join(' and ')}, Row ${r + 1} would have ${minB} buildings, exceeding its limit of ${level.rowClues[r]} building(s)`;
          }
          return `${fillCol}${stepsToUse.map((s) => s.text).join(', ')}, which causes Row ${r + 1} to exceed its limit of ${level.rowClues[r]} building(s)`;
        }
        return `Row ${r + 1} would exceed its limit of ${level.rowClues[r]} building(s)`;
      }
      if (maxB < level.rowClues[r]) {
        return `Row ${r + 1} wouldn't have enough valid spots left for its ${level.rowClues[r]} required building(s)`;
      }
      if (minB === level.rowClues[r]) {
        for (let c = 0; c < size; c++) {
          if (
            !mustBeBuilding(domains[r][c]) &&
            removeBuildingsFromDomain(domains[r][c])
          ) {
            changed = true;
          }
        }
      }
      if (maxB === level.rowClues[r]) {
        for (let c = 0; c < size; c++) {
          if (canBeAnyBuilding(domains[r][c])) {
            if (domains[r][c].delete('empty')) changed = true;
            if (domains[r][c].delete('road')) changed = true;
          }
        }
      }
    }

    // Col building count bounds
    for (let c = 0; c < size; c++) {
      let minB = 0;
      let maxB = 0;
      for (let r = 0; r < size; r++) {
        if (mustBeBuilding(domains[r][c])) minB++;
        if (canBeAnyBuilding(domains[r][c])) maxB++;
      }
      if (minB > level.colClues[c]) {
        const relevant = forcedSteps.filter((s) => s.targetC === c);
        const stepsToUse = relevant.length > 0 ? relevant : forcedSteps;
        if (stepsToUse.length > 0) {
          const fillRow =
            candidate === 'town_hall' || isBuilding(candidate)
              ? `fill Row ${testR + 1}, `
              : '';
          const otherMustRows: number[] = [];
          for (let rr = 0; rr < size; rr++) {
            if (
              mustBeBuilding(domains[rr][c]) &&
              !stepsToUse.some((s) => s.targetR === rr && s.targetC === c)
            ) {
              otherMustRows.push(rr);
            }
          }
          if (otherMustRows.length > 0) {
            const names = otherMustRows.map((rr) => {
              const alreadyLocked = getLockedTile(baseDomains[rr][c]);
              if (alreadyLocked && isBuilding(alreadyLocked)) {
                return `${formatTileName(alreadyLocked)} at ${xy(rr, c)}`;
              }
              return `${xy(rr, c)} (needed for Row ${rr + 1})`;
            });
            return `${fillRow}${stepsToUse.map((s) => s.text).join(', ')}. Along with ${names.join(' and ')}, Column ${c + 1} would have ${minB} buildings, exceeding its limit of ${level.colClues[c]} building(s)`;
          }
          return `${fillRow}${stepsToUse.map((s) => s.text).join(', ')}, which causes Column ${c + 1} to exceed its limit of ${level.colClues[c]} building(s)`;
        }
        return `Column ${c + 1} would exceed its limit of ${level.colClues[c]} building(s)`;
      }
      if (maxB < level.colClues[c]) {
        return `Column ${c + 1} wouldn't have enough valid spots left for its ${level.colClues[c]} required building(s)`;
      }
      if (minB === level.colClues[c]) {
        for (let r = 0; r < size; r++) {
          if (
            !mustBeBuilding(domains[r][c]) &&
            removeBuildingsFromDomain(domains[r][c])
          ) {
            changed = true;
          }
        }
      }
      if (maxB === level.colClues[c]) {
        for (let r = 0; r < size; r++) {
          if (canBeAnyBuilding(domains[r][c])) {
            if (domains[r][c].delete('empty')) changed = true;
            if (domains[r][c].delete('road')) changed = true;
          }
        }
      }
    }

    // Adjacency & locked propagation
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dom = domains[r][c];
        if (dom.size === 0) {
          return `${xy(r, c)} would have no valid tile options left`;
        }
        const ortho = getOrthoNeighbors(size, r, c);
        const surr8 = getSurrounding8Neighbors(size, r, c);

        if (
          dom.has('woodcutter') &&
          (!ortho.some((n) => domains[n.r][n.c].has('tree')) ||
            !ortho.some((n) => domains[n.r][n.c].has('house')))
        ) {
          dom.delete('woodcutter');
          changed = true;
        }
        if (
          dom.has('house') &&
          !ortho.some(
            (n) =>
              domains[n.r][n.c].has('woodcutter') ||
              domains[n.r][n.c].has('farm')
          )
        ) {
          dom.delete('house');
          changed = true;
        }
        if (
          dom.has('farm') &&
          !ortho.some((n) => domains[n.r][n.c].has('house'))
        ) {
          dom.delete('farm');
          changed = true;
        }
        if (
          dom.has('town_hall') &&
          surr8.some(
            (n) =>
              domains[n.r][n.c].has('tree') ||
              domains[n.r][n.c].has('rock') ||
              mustBeBuilding(domains[n.r][n.c])
          )
        ) {
          dom.delete('town_hall');
          changed = true;
        }

        const locked = getLockedTile(dom);
        if (locked === 'tree') {
          const wcNeighbors = ortho.filter((n) =>
            domains[n.r][n.c].has('woodcutter')
          );
          if (wcNeighbors.length === 0) {
            return `the Tree at ${xy(r, c)} would have no valid spot for its required Woodcutter`;
          }
          if (wcNeighbors.length === 1) {
            const target = wcNeighbors[0];
            if (domains[target.r][target.c].size > 1) {
              domains[target.r][target.c].clear();
              domains[target.r][target.c].add('woodcutter');
              changed = true;
            }
          }
        }
        if (locked === 'woodcutter' || locked === 'farm') {
          const houseNeighbors = ortho.filter((n) =>
            domains[n.r][n.c].has('house')
          );
          if (houseNeighbors.length === 0) {
            return `the ${formatTileName(locked)} at ${xy(r, c)} would have no valid spot for its required House`;
          }
          if (houseNeighbors.length === 1) {
            const target = houseNeighbors[0];
            if (domains[target.r][target.c].size > 1) {
              domains[target.r][target.c].clear();
              domains[target.r][target.c].add('house');
              changed = true;
              forcedSteps.push({
                text: `forcing ${formatTileName(locked)} at ${xy(r, c)}'s House into ${xy(target.r, target.c)}`,
                targetR: target.r,
                targetC: target.c
              });
            }
          }
        }

        if (locked && isBuilding(locked)) {
          for (let cc = 0; cc < size; cc++) {
            if (cc !== c && domains[r][cc].delete(locked)) changed = true;
          }
          for (let rr = 0; rr < size; rr++) {
            if (rr !== r && domains[rr][c].delete(locked)) changed = true;
          }
          for (const n of surr8) {
            if (domains[n.r][n.c].delete(locked)) changed = true;
            if (
              locked === 'town_hall' &&
              removeBuildingsFromDomain(domains[n.r][n.c])
            ) {
              changed = true;
            }
          }
        }
      }
    }

    // Inventory bounds
    for (const pType of PLACEABLE_TYPES) {
      const target = level.inventory[pType];
      let minCount = 0;
      let maxCount = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (getLockedTile(domains[r][c]) === pType) minCount++;
          if (domains[r][c].has(pType)) maxCount++;
        }
      }
      if (minCount > target) {
        return `more than ${target} ${formatTileName(pType)}(s) would be forced`;
      }
      if (maxCount < target) {
        return `there wouldn't be enough valid spots left to place all ${target} required ${formatTileName(pType)}(s)`;
      }
      if (minCount === target) {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (
              getLockedTile(domains[r][c]) !== pType &&
              domains[r][c].delete(pType)
            ) {
              changed = true;
            }
          }
        }
      }
      if (maxCount === target && target > 0) {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (domains[r][c].has(pType) && domains[r][c].size > 1) {
              domains[r][c].clear();
              domains[r][c].add(pType);
              changed = true;
            }
          }
        }
      }
    }
  }

  const allLocked = domains.every((row) => row.every((d) => d.size === 1));
  if (allLocked) {
    const grid = domains.map((row) => row.map((d) => getLockedTile(d)!));
    const val = validateBoard(grid, level);
    if (!val.isSolved) {
      return `the road network could not connect all Woodcutters and Farms to the Town Hall within ${level.inventory.road} Road tile(s)`;
    }
    return null;
  }

  if (level.inventory.town_hall > 0) {
    const thCells: Coord[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (domains[r][c].has('town_hall')) thCells.push({ r, c });
      }
    }
    if (thCells.length === 0) {
      return `no valid spot would remain for the Town Hall`;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const locked = getLockedTile(domains[r][c]);
        if (locked === 'woodcutter' || locked === 'farm') {
          const canConnect = thCells.some(
            (th) =>
              shortestPossibleRoadDistance(domains, r, c, th.r, th.c) <=
              level.inventory.road
          );
          if (!canConnect) {
            return `the ${formatTileName(locked)} at ${xy(r, c)} could no longer connect to the Town Hall within ${level.inventory.road} Road tile(s)`;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Exhaustive backtracking solver to count the number of valid solutions (up to maxSolutions).
 */
export function countSolutions(
  level: LevelDefinition,
  maxSolutions = 2
): { count: number; solutions: TileType[][][] } {
  const size = level.size;
  const grid: TileType[][] = level.initialGrid.map((row) => [...row]);
  const solutions: TileType[][][] = [];

  const remainingBuildings: Record<BuildingType, number> = {
    town_hall: level.inventory.town_hall,
    woodcutter: level.inventory.woodcutter,
    farm: level.inventory.farm,
    house: level.inventory.house
  };

  const rowRem = [...level.rowClues];
  const colRem = [...level.colClues];

  function canPlaceBuildingPartial(
    r: number,
    c: number,
    bType: BuildingType
  ): boolean {
    if (remainingBuildings[bType] <= 0) return false;
    if (rowRem[r] <= 0 || colRem[c] <= 0) return false;

    for (let cc = 0; cc < size; cc++) {
      if (grid[r][cc] === bType) return false;
    }
    for (let rr = 0; rr < size; rr++) {
      if (grid[rr][c] === bType) return false;
    }

    const surr8 = getSurrounding8Neighbors(size, r, c);
    for (const n of surr8) {
      const nt = grid[n.r][n.c];
      if (nt === bType) return false;
      if (nt === 'town_hall') return false;
      if (bType === 'town_hall' && (isBuilding(nt) || isFixedObstacle(nt))) {
        return false;
      }
    }

    if (bType === 'woodcutter') {
      const ortho = getOrthoNeighbors(size, r, c);
      if (!ortho.some((n) => grid[n.r][n.c] === 'tree')) return false;
    }

    return true;
  }

  function searchBuildings(row: number, col: number) {
    if (solutions.length >= maxSolutions) return;

    if (row === size) {
      for (const b of BUILDING_TYPES) {
        if (remainingBuildings[b] !== 0) return;
      }
      for (let c = 0; c < size; c++) {
        if (colRem[c] !== 0) return;
      }

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const t = grid[r][c];
          const ortho = getOrthoNeighbors(size, r, c);
          if (t === 'tree') {
            if (!ortho.some((n) => grid[n.r][n.c] === 'woodcutter')) {
              return;
            }
          } else if (t === 'house') {
            if (
              !ortho.some(
                (n) => grid[n.r][n.c] === 'woodcutter' || grid[n.r][n.c] === 'farm'
              )
            ) {
              return;
            }
          } else if (t === 'farm' || t === 'woodcutter') {
            if (!ortho.some((n) => grid[n.r][n.c] === 'house')) {
              return;
            }
          }
        }
      }

      const targetRoads = level.inventory.road;
      if (targetRoads === 0) {
        if (validateBoard(grid, level).isSolved) {
          solutions.push(grid.map((r) => [...r]));
        }
      } else {
        const roadNets = findValidRoadNetworksForBuildings(
          grid,
          targetRoads,
          maxSolutions - solutions.length
        );
        for (const net of roadNets) {
          const solGrid = grid.map((r) => [...r]);
          for (const rc of net) {
            solGrid[rc.r][rc.c] = 'road';
          }
          if (validateBoard(solGrid, level).isSolved) {
            solutions.push(solGrid);
            if (solutions.length >= maxSolutions) return;
          }
        }
      }
      return;
    }

    const nextRow = col === size - 1 ? row + 1 : row;
    const nextCol = col === size - 1 ? 0 : col + 1;

    let availInRow = 0;
    for (let cc = col; cc < size; cc++) {
      if (grid[row][cc] === 'empty') availInRow++;
    }
    if (rowRem[row] > availInRow) return;

    let availInCol = 0;
    for (let rr = row; rr < size; rr++) {
      if (grid[rr][col] === 'empty') availInCol++;
    }
    if (colRem[col] > availInCol) return;

    if (grid[row][col] !== 'empty') {
      if (col === size - 1 && rowRem[row] !== 0) return;
      searchBuildings(nextRow, nextCol);
      return;
    }

    for (const bType of BUILDING_TYPES) {
      if (canPlaceBuildingPartial(row, col, bType)) {
        grid[row][col] = bType;
        remainingBuildings[bType]--;
        rowRem[row]--;
        colRem[col]--;

        if (col < size - 1 || rowRem[row] === 0) {
          searchBuildings(nextRow, nextCol);
        }

        grid[row][col] = 'empty';
        remainingBuildings[bType]++;
        rowRem[row]++;
        colRem[col]++;
      }
    }

    if (rowRem[row] <= availInRow - 1 && colRem[col] <= availInCol - 1) {
      if (col < size - 1 || rowRem[row] === 0) {
        searchBuildings(nextRow, nextCol);
      }
    }
  }

  searchBuildings(0, 0);

  return {
    count: solutions.length,
    solutions
  };
}

export function getNextHint(
  playerGrid: TileType[][],
  playerMarks: boolean[][],
  level: LevelDefinition,
  playerBuildingMarks?: boolean[][]
): DeductionHint | null {
  const size = level.size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const pTile = playerGrid[r][c];
      if (isFixedObstacle(pTile) || pTile === 'empty') continue;
      if (pTile !== level.solution[r][c]) {
        const msg = `The ${formatTileName(pTile)} at ${xy(r, c)} doesn't belong there — try removing it first!`;
        return {
          r,
          c,
          action: 'mark_empty',
          ruleName: 'Check Placement',
          explanation: msg,
          steps: [
            {
              title: 'Check Placement',
              message: msg,
              discardedCells: [{ r, c }],
              targetCell: { r, c }
            }
          ]
        };
      }

      if (playerMarks[r][c] && isBuilding(level.solution[r][c])) {
        const msg = `${xy(r, c)} is marked as clear ground, but a building belongs here — try unmarking it!`;
        return {
          r,
          c,
          action: 'mark_empty',
          ruleName: 'Check Mark',
          explanation: msg,
          steps: [
            {
              title: 'Check Mark',
              message: msg,
              focusCells: [{ r, c }],
              targetCell: { r, c }
            }
          ]
        };
      }
    }
  }

  // 0. Check for any satisfied Row or Column clues that still have un-marked sand squares
  for (let r = 0; r < size; r++) {
    let placedInRow = 0;
    const placedDesc: string[] = [];
    for (let c = 0; c < size; c++) {
      if (isBuilding(playerGrid[r][c])) {
        placedInRow++;
        placedDesc.push(`${formatTileName(playerGrid[r][c])} at ${xy(r, c)}`);
      } else if (playerBuildingMarks && playerBuildingMarks[r][c]) {
        placedInRow++;
        placedDesc.push(`Building at ${xy(r, c)}`);
      }
    }
    const quota = level.rowClues[r];
    if (placedInRow === quota) {
      const unmarkedInRow: Coord[] = [];
      for (let c = 0; c < size; c++) {
        if (
          playerGrid[r][c] === 'empty' &&
          !playerMarks[r][c] &&
          !(playerBuildingMarks && playerBuildingMarks[r][c]) &&
          !isFixedObstacle(level.initialGrid[r][c])
        ) {
          unmarkedInRow.push({ r, c });
        }
      }
      if (unmarkedInRow.length > 0) {
        const title = 'Row Clue Complete';
        const msg1 =
          quota === 0
            ? `Row ${r + 1} has a clue of 0, so no buildings can be placed here.`
            : `Row ${r + 1} already has all ${quota} of its required building(s) placed (${placedDesc.join(', ')}).`;
        const msg2 = `Tap the Row ${r + 1} badge (or click Apply) to mark the remaining ${unmarkedInRow.length} spot(s) as clear ground.`;
        return {
          r: unmarkedInRow[0].r,
          c: unmarkedInRow[0].c,
          action: 'mark_empty',
          lineAction: { axis: 'row', index: r },
          ruleName: title,
          explanation: `${msg1} ${msg2}`,
          steps: [
            {
              title,
              message: msg1,
              highlightLine: { axis: 'row', index: r },
              focusCells: unmarkedInRow,
              candidateCells: unmarkedInRow
            },
            {
              title,
              message: msg2,
              highlightLine: { axis: 'row', index: r },
              focusCells: unmarkedInRow,
              targetCell: unmarkedInRow[0],
              candidateCells: unmarkedInRow
            }
          ]
        };
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let placedInCol = 0;
    const placedDesc: string[] = [];
    for (let r = 0; r < size; r++) {
      if (isBuilding(playerGrid[r][c])) {
        placedInCol++;
        placedDesc.push(`${formatTileName(playerGrid[r][c])} at ${xy(r, c)}`);
      } else if (playerBuildingMarks && playerBuildingMarks[r][c]) {
        placedInCol++;
        placedDesc.push(`Building at ${xy(r, c)}`);
      }
    }
    const quota = level.colClues[c];
    if (placedInCol === quota) {
      const unmarkedInCol: Coord[] = [];
      for (let r = 0; r < size; r++) {
        if (
          playerGrid[r][c] === 'empty' &&
          !playerMarks[r][c] &&
          !(playerBuildingMarks && playerBuildingMarks[r][c]) &&
          !isFixedObstacle(level.initialGrid[r][c])
        ) {
          unmarkedInCol.push({ r, c });
        }
      }
      if (unmarkedInCol.length > 0) {
        const title = 'Column Clue Complete';
        const msg1 =
          quota === 0
            ? `Column ${c + 1} has a clue of 0, so no buildings can be placed here.`
            : `Column ${c + 1} already has all ${quota} of its required building(s) placed (${placedDesc.join(', ')}).`;
        const msg2 = `Tap the Column ${c + 1} badge (or click Apply) to mark the remaining ${unmarkedInCol.length} spot(s) as clear ground.`;
        return {
          r: unmarkedInCol[0].r,
          c: unmarkedInCol[0].c,
          action: 'mark_empty',
          lineAction: { axis: 'col', index: c },
          ruleName: title,
          explanation: `${msg1} ${msg2}`,
          steps: [
            {
              title,
              message: msg1,
              highlightLine: { axis: 'col', index: c },
              focusCells: unmarkedInCol,
              candidateCells: unmarkedInCol
            },
            {
              title,
              message: msg2,
              highlightLine: { axis: 'col', index: c },
              focusCells: unmarkedInCol,
              targetCell: unmarkedInCol[0],
              candidateCells: unmarkedInCol
            }
          ]
        };
      }
    }
  }

  const result = solveByDeduction(level, playerGrid, playerMarks, playerBuildingMarks);

  const normalizeHint = (step: DeductionHint): DeductionHint => {
    if (!step.steps || step.steps.length === 0) {
      step.steps = [
        {
          title: step.ruleName,
          message: step.explanation,
          targetCell: { r: step.r, c: step.c }
        }
      ];
    }
    return step;
  };

  // Strictly in chronological deduction order: return the earliest unfulfilled deduction
  for (const step of result.steps) {
    if (playerGrid[step.r][step.c] !== 'empty') continue;

    // Do not surface hints that rely on unplaced line quotas not visible on the board:
    if (
      step.explanation.includes('claimed by unplaced buildings') ||
      (step.explanation.includes('quota of') &&
        step.explanation.includes('already claimed'))
    ) {
      continue;
    }

    if (step.action === 'mark_empty') {
      if (!playerMarks[step.r][step.c]) {
        return normalizeHint(step);
      }
    } else if (step.action === 'mark_building') {
      if (!playerBuildingMarks?.[step.r]?.[step.c]) {
        return normalizeHint(step);
      }
    } else if (step.action === 'place') {
      return normalizeHint(step);
    }
  }

  return null;
}
