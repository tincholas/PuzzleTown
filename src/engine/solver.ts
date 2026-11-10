import {
  BuildingType,
  BUILDING_TYPES,
  Coord,
  DeductionHint,
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
}

/**
 * Formats grid coordinates (row, col) as human-friendly 1-based (X, Y) = (col + 1, row + 1).
 */
function xy(r: number, c: number): string {
  return `(${c + 1}, ${r + 1})`;
}

function createInitialDomains(
  level: LevelDefinition,
  currentGrid?: TileType[][]
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
  startingGrid?: TileType[][]
): DeductionResult {
  const size = level.size;
  const domains = createInitialDomains(level, startingGrid);
  const steps: DeductionHint[] = [];
  const hasTownHall = level.inventory.town_hall > 0;
  const maxRoads = level.inventory.road;

  // Store concise reasons why specific candidates were eliminated at each cell (r, c)
  const cellElimReasons: Record<string, Partial<Record<TileType, string>>> = {};
  const recordElimReason = (
    r: number,
    c: number,
    eliminatedType: TileType,
    reason: string
  ) => {
    const key = `${r},${c}`;
    if (!cellElimReasons[key]) cellElimReasons[key] = {};
    if (!cellElimReasons[key][eliminatedType]) {
      cellElimReasons[key][eliminatedType] = reason;
    }
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
    isDirectForce = false
  ) => {
    if (prevSize > 1 && domains[r][c].size === 1) {
      const locked = getLockedTile(domains[r][c])!;
      if (locked === 'empty') {
        steps.push({
          r,
          c,
          action: 'mark_empty',
          ruleName,
          explanation
        });
      } else if (locked !== 'tree' && locked !== 'rock') {
        let finalRuleName = ruleName;
        let finalExplanation = explanation;

        if (!isDirectForce) {
          // Locked by eliminating the last alternative! Build a crystal-clear summary of why `locked` is the only option left.
          const reasons = cellElimReasons[`${r},${c}`] ?? {};
          const otherBuildings = BUILDING_TYPES.filter(
            (b) => b !== locked && level.inventory[b] > 0
          );
          const ruledOutNotes = otherBuildings
            .map((b) => {
              const rText = reasons[b];
              return rText
                ? `not ${formatTileName(b)} (${rText})`
                : `not ${formatTileName(b)}`;
            })
            .join(', ');

          const mustBeBuildingReason =
            reasons['empty'] ?? 'this spot must contain a building';

          if (isBuilding(locked)) {
            finalRuleName = `Only ${formatTileName(locked)} Fits`;
            finalExplanation = `${xy(r, c)} must be a ${formatTileName(locked)}: ${mustBeBuildingReason}, and it is ${ruledOutNotes}.`;
          } else {
            finalRuleName = `Must Be Road`;
            finalExplanation = `${xy(r, c)} cannot be a building or empty (${explanation}), so it must be a Road.`;
          }
        }

        steps.push({
          r,
          c,
          action: 'place',
          tileType: locked,
          ruleName: finalRuleName,
          explanation: finalExplanation
        });
      }
    }
  };

  let progress = true;
  while (progress) {
    progress = false;

    // --- RULE 1: Row & Column Clue Zero / Completed Elimination ---
    for (let r = 0; r < size; r++) {
      let confirmedBuildings = 0;
      for (let c = 0; c < size; c++) {
        if (mustBeBuilding(domains[r][c])) confirmedBuildings++;
      }
      if (confirmedBuildings === level.rowClues[r]) {
        for (let c = 0; c < size; c++) {
          if (!mustBeBuilding(domains[r][c]) && canBeAnyBuilding(domains[r][c])) {
            const prev = domains[r][c].size;
            const reason =
              level.rowClues[r] === 0
                ? `Row ${r + 1} needs 0 buildings`
                : `Row ${r + 1} already has all ${level.rowClues[r]} building(s)`;
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
                level.rowClues[r] === 0
                  ? `Row ${r + 1} has a clue of 0, so no buildings can be placed in Row ${r + 1}.`
                  : `Row ${r + 1} already has all ${level.rowClues[r]} of its buildings, so ${xy(r, c)} cannot be a building.`,
                true
              );
            }
          }
        }
      }
    }

    for (let c = 0; c < size; c++) {
      let confirmedBuildings = 0;
      for (let r = 0; r < size; r++) {
        if (mustBeBuilding(domains[r][c])) confirmedBuildings++;
      }
      if (confirmedBuildings === level.colClues[c]) {
        for (let r = 0; r < size; r++) {
          if (!mustBeBuilding(domains[r][c]) && canBeAnyBuilding(domains[r][c])) {
            const prev = domains[r][c].size;
            const reason =
              level.colClues[c] === 0
                ? `Column ${c + 1} needs 0 buildings`
                : `Column ${c + 1} already has all ${level.colClues[c]} building(s)`;
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
                level.colClues[c] === 0
                  ? `Column ${c + 1} has a clue of 0, so no buildings can be placed in Column ${c + 1}.`
                  : `Column ${c + 1} already has all ${level.colClues[c]} of its buildings, so ${xy(r, c)} cannot be a building.`,
                true
              );
            }
          }
        }
      }
    }

    // --- RULE 2: Row & Column Full Building Forcing ---
    for (let r = 0; r < size; r++) {
      const buildingCandidates: number[] = [];
      for (let c = 0; c < size; c++) {
        if (canBeAnyBuilding(domains[r][c])) buildingCandidates.push(c);
      }
      if (
        buildingCandidates.length === level.rowClues[r] &&
        level.rowClues[r] > 0
      ) {
        for (const c of buildingCandidates) {
          const prev = domains[r][c].size;
          const removedEmpty = domains[r][c].delete('empty');
          const removedRoad = domains[r][c].delete('road');
          if (removedEmpty || removedRoad) {
            const reason = `Row ${r + 1} needs ${level.rowClues[r]} building(s) and only ${buildingCandidates.length} valid building spot(s) exist in this row`;
            recordElimReason(r, c, 'empty', reason);
            recordElimReason(r, c, 'road', reason);
            progress = true;
            recordLockIfNew(r, c, prev, 'Row Must Be Filled', reason, false);
          }
        }
      }
    }

    for (let c = 0; c < size; c++) {
      const buildingCandidates: number[] = [];
      for (let r = 0; r < size; r++) {
        if (canBeAnyBuilding(domains[r][c])) buildingCandidates.push(r);
      }
      if (
        buildingCandidates.length === level.colClues[c] &&
        level.colClues[c] > 0
      ) {
        for (const r of buildingCandidates) {
          const prev = domains[r][c].size;
          const removedEmpty = domains[r][c].delete('empty');
          const removedRoad = domains[r][c].delete('road');
          if (removedEmpty || removedRoad) {
            const reason = `Column ${c + 1} needs ${level.colClues[c]} building(s) and only ${buildingCandidates.length} valid building spot(s) exist in this column`;
            recordElimReason(r, c, 'empty', reason);
            recordElimReason(r, c, 'road', reason);
            progress = true;
            recordLockIfNew(r, c, prev, 'Column Must Be Filled', reason, false);
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
          const hasHouse = ortho.some((n) => domains[n.r][n.c].has('house'));
          if (!hasTree || !hasHouse) {
            dom.delete('woodcutter');
            const shortReason = !hasTree
              ? 'not next to a Tree'
              : 'no adjacent spot for a House';
            recordElimReason(r, c, 'woodcutter', shortReason);
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
          }
        }

        if (dom.has('town_hall')) {
          const blocker = surr8.find((n) => {
            const nd = domains[n.r][n.c];
            return nd.has('tree') || nd.has('rock') || mustBeBuilding(nd);
          });
          if (blocker) {
            dom.delete('town_hall');
            recordElimReason(
              r,
              c,
              'town_hall',
              `too close to ${xy(blocker.r, blocker.c)}`
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
          const hasPartner = ortho.some(
            (n) =>
              domains[n.r][n.c].has('woodcutter') ||
              domains[n.r][n.c].has('farm')
          );
          if (!hasPartner) {
            dom.delete('house');
            recordElimReason(
              r,
              c,
              'house',
              'no adjacent spot for a Woodcutter or Farm'
            );
            progress = true;
            recordLockIfNew(
              r,
              c,
              prev,
              'House Adjacency',
              `${xy(r, c)} has no adjacent spot for a Woodcutter or Farm, so it cannot be a House.`
            );
          }
        }

        if (dom.has('farm')) {
          const hasHouse = ortho.some((n) => domains[n.r][n.c].has('house'));
          if (!hasHouse) {
            dom.delete('farm');
            recordElimReason(r, c, 'farm', 'no adjacent spot for a House');
            progress = true;
            recordLockIfNew(
              r,
              c,
              prev,
              'Farm Adjacency',
              `${xy(r, c)} has no adjacent spot for a House, so it cannot be a Farm.`
            );
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
                recordElimReason(
                  r,
                  c,
                  roadBuilding,
                  'no orthogonal exit for a Road'
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
              recordElimReason(r, c, 'road', 'would be a dead-end road');
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
            recordElimReason(
              r,
              cc,
              locked,
              `Row ${r + 1} already has a ${formatTileName(locked)} at ${xy(r, c)}`
            );
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
            recordElimReason(
              rr,
              c,
              locked,
              `Column ${c + 1} already has a ${formatTileName(locked)} at ${xy(r, c)}`
            );
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
            recordElimReason(
              n.r,
              n.c,
              locked,
              `touches ${formatTileName(locked)} at ${xy(r, c)}`
            );
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
            for (const b of BUILDING_TYPES) {
              recordElimReason(
                n.r,
                n.c,
                b,
                `in Town Hall perimeter around ${xy(r, c)}`
              );
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

    // --- RULE 5: Inventory Exhaustion & Hidden Singles ---
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
            recordElimReason(
              cell.r,
              cell.c,
              pType,
              `all ${targetCount} ${formatTileName(pType)}(s) already placed`
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

    // --- RULE 6: Forced Adjacency Partners & Line Claiming ---
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
              recordLockIfNew(
                target.r,
                target.c,
                prev,
                'Tree Needs Woodcutter',
                `Every Tree must have a Woodcutter next to it, and ${xy(target.r, target.c)} is the only valid spot next to the Tree at ${xy(r, c)}.`,
                true
              );
            }
          } else if (wcNeighbors.length > 1) {
            // Line Claiming: if all possible Woodcutter spots for this Tree lie in the same Row or Column,
            // no OTHER cell in that Row/Column can be a Woodcutter!
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
                  const reason = `Row ${sharedRow + 1}'s Woodcutter is claimed by the Tree at ${xy(r, c)}`;
                  recordElimReason(sharedRow, cc, 'woodcutter', reason);
                  progress = true;
                  recordLockIfNew(
                    sharedRow,
                    cc,
                    prev,
                    'Row Woodcutter Claimed',
                    reason
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
                  const reason = `Column ${sharedCol + 1}'s Woodcutter is claimed by the Tree at ${xy(r, c)}`;
                  recordElimReason(rr, sharedCol, 'woodcutter', reason);
                  progress = true;
                  recordLockIfNew(
                    rr,
                    sharedCol,
                    prev,
                    'Column Woodcutter Claimed',
                    reason
                  );
                }
              }
            }
          }
        }

        // 6b. Woodcutter and Farm each need a House
        if (locked === 'farm' || locked === 'woodcutter') {
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
              recordLockIfNew(
                target.r,
                target.c,
                prev,
                `${formatTileName(locked)} Needs House`,
                `The ${formatTileName(locked)} at ${xy(r, c)} must touch a House, and ${xy(target.r, target.c)} is its only valid neighbor.`,
                true
              );
            }
          } else if (houseNeighbors.length > 1) {
            // Line Claiming: if all possible House spots for this Woodcutter/Farm lie in the same Row or Column,
            // no OTHER cell in that Row/Column can be a House!
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
                  const reason = `Row ${sharedRow + 1}'s House must sit next to the ${formatTileName(locked)} at ${xy(r, c)}`;
                  recordElimReason(sharedRow, cc, 'house', reason);
                  progress = true;
                  recordLockIfNew(
                    sharedRow,
                    cc,
                    prev,
                    'Row House Claimed',
                    reason
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
                  const reason = `Column ${sharedCol + 1}'s House must sit next to the ${formatTileName(locked)} at ${xy(r, c)}`;
                  recordElimReason(rr, sharedCol, 'house', reason);
                  progress = true;
                  recordLockIfNew(
                    rr,
                    sharedCol,
                    prev,
                    'Column House Claimed',
                    reason
                  );
                }
              }
            }
          }
        }

        if (locked === 'house') {
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
            for (const t of Array.from(dom)) {
              if (t !== 'woodcutter' && t !== 'farm') {
                dom.delete(t);
                recordElimReason(
                  target.r,
                  target.c,
                  t,
                  `must be a Woodcutter or Farm for the House at ${xy(r, c)}`
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

        if (
          hasTownHall &&
          (locked === 'woodcutter' ||
            locked === 'farm' ||
            locked === 'town_hall')
        ) {
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
              recordLockIfNew(
                target.r,
                target.c,
                prev,
                'Road Entry Point',
                `The ${formatTileName(locked)} at ${xy(r, c)} needs a Road connection, and ${xy(target.r, target.c)} is its only available exit.`,
                true
              );
            }
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
              const reason = `too far from Town Hall to connect within ${maxRoads} Road(s)`;
              recordElimReason(r, c, bType, reason);
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
                recordElimReason(r, c, 'road', 'not on the Road path');
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
              const prev = domains[r][c].size;
              domains[r][c].delete(candidate);
              recordElimReason(r, c, candidate, contradiction);
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
    finalDomains: domains
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
  level: LevelDefinition
): DeductionHint | null {
  const size = level.size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const pTile = playerGrid[r][c];
      if (isFixedObstacle(pTile) || pTile === 'empty') continue;
      if (pTile !== level.solution[r][c]) {
        return {
          r,
          c,
          action: 'mark_empty',
          ruleName: 'Check Placement',
          explanation: `The ${formatTileName(pTile)} at ${xy(r, c)} doesn't belong there — try removing it first!`
        };
      }
    }
  }

  const result = solveByDeduction(level, playerGrid);

  // 1. Prefer direct single-rule placements (e.g. "Tree Needs Woodcutter", "Only Remaining Spot", "Farm Needs House")
  for (const step of result.steps) {
    if (
      step.action === 'place' &&
      playerGrid[step.r][step.c] === 'empty' &&
      !step.ruleName.startsWith('Only ') &&
      step.ruleName !== 'Only Remaining Spot'
    ) {
      return step;
    }
  }

  // 2. Next prefer "Only Remaining Spot" (Hidden Single for a building type)
  for (const step of result.steps) {
    if (
      step.action === 'place' &&
      playerGrid[step.r][step.c] === 'empty' &&
      step.ruleName === 'Only Remaining Spot'
    ) {
      return step;
    }
  }

  // 3. Next any remaining 'place' step (including full Process of Elimination explanations)
  for (const step of result.steps) {
    if (step.action === 'place' && playerGrid[step.r][step.c] === 'empty') {
      return step;
    }
  }

  for (const step of result.steps) {
    if (
      step.action === 'mark_empty' &&
      playerGrid[step.r][step.c] === 'empty' &&
      !playerMarks[step.r][step.c]
    ) {
      return step;
    }
  }

  return null;
}
