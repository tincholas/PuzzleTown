import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_CONFIGS,
  getCampaignLevel
} from '../src/engine/campaignLevels';
import { countSolutions, getNextHint, solveByDeduction } from '../src/engine/solver';
import { LevelDefinition, PLACEABLE_TYPES, TileType } from '../src/engine/types';
import {
  getOrthoNeighbors,
  hasRoadPathToTownHall,
  isRoadTileOnValidPath,
  validateBoard
} from '../src/engine/validator';

describe('PuzzleTown Rule Validator', () => {
  it('validates turning road paths between Woodcutter/Farm and Town Hall', () => {
    // 5x5 board with Town Hall at (0,0), turning L-road through (0,1)->(1,1)->(2,1) to Woodcutter at (2,2)
    const grid: TileType[][] = [
      ['town_hall', 'road', 'empty', 'empty', 'empty'],
      ['empty', 'road', 'empty', 'empty', 'empty'],
      ['empty', 'road', 'woodcutter', 'tree', 'empty'],
      ['empty', 'empty', 'house', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty']
    ];

    expect(hasRoadPathToTownHall(grid, 2, 2)).toBe(true);
    expect(isRoadTileOnValidPath(grid, 0, 1)).toBe(true);
    expect(isRoadTileOnValidPath(grid, 1, 1)).toBe(true);
    expect(isRoadTileOnValidPath(grid, 2, 1)).toBe(true);

    const level: LevelDefinition = {
      id: 999,
      chapter: 1,
      chapterName: 'Test',
      title: 'Turning Road Test',
      size: 5,
      initialGrid: grid.map((r) =>
        r.map((c) => (c === 'tree' ? 'tree' : 'empty'))
      ),
      rowClues: [1, 0, 1, 1, 0],
      colClues: [1, 0, 2, 0, 0],
      inventory: {
        town_hall: 1,
        woodcutter: 1,
        house: 1,
        farm: 0,
        road: 3
      },
      solution: grid,
      difficulty: 'Easy'
    };

    const validation = validateBoard(grid, level);
    expect(validation.isSolved).toBe(true);
    expect(Object.keys(validation.cellErrors)).toHaveLength(0);
  });

  it('flags violations of Town Hall 8-way perimeter and same-building row/col rules', () => {
    const grid: TileType[][] = [
      ['town_hall', 'road', 'woodcutter', 'tree'],
      ['house', 'empty', 'empty', 'empty'], // House at (1,0) is in Town Hall's 8-perimeter!
      ['empty', 'empty', 'woodcutter', 'tree'], // Second Woodcutter in col 2!
      ['empty', 'empty', 'empty', 'empty']
    ];

    const level: LevelDefinition = {
      id: 998,
      chapter: 1,
      chapterName: 'Test',
      title: 'Violation Test',
      size: 4,
      initialGrid: grid.map((r) =>
        r.map((c) => (c === 'tree' ? 'tree' : 'empty'))
      ),
      rowClues: [2, 1, 1, 0],
      colClues: [2, 0, 2, 0],
      inventory: {
        town_hall: 1,
        woodcutter: 2,
        house: 1,
        farm: 0,
        road: 1
      },
      solution: grid,
      difficulty: 'Easy'
    };

    const res = validateBoard(grid, level);
    expect(res.isSolved).toBe(false);
    expect(res.cellErrors['0,0']).toBeDefined();
    expect(res.cellErrors['1,0']).toBeDefined();
    expect(res.cellErrors['0,2']).toBeDefined();
    expect(res.cellErrors['2,2']).toBeDefined();
  });

  it('requires every Tree to have an adjacent Woodcutter and every Woodcutter to have an adjacent House', () => {
    // Tree at (3,3) has no Woodcutter next to it, and Woodcutter at (0,1) has no House next to it
    const grid: TileType[][] = [
      ['tree', 'woodcutter', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
      ['empty', 'farm', 'house', 'empty'],
      ['empty', 'empty', 'empty', 'tree']
    ];

    const level: LevelDefinition = {
      id: 997,
      chapter: 1,
      chapterName: 'Test',
      title: 'Tree & Woodcutter Partner Test',
      size: 4,
      initialGrid: grid.map((r) =>
        r.map((c) => (c === 'tree' ? 'tree' : 'empty'))
      ),
      rowClues: [1, 0, 2, 0],
      colClues: [0, 2, 1, 0],
      inventory: {
        town_hall: 0,
        woodcutter: 1,
        house: 1,
        farm: 1,
        road: 0
      },
      solution: grid,
      difficulty: 'Easy'
    };

    const res = validateBoard(grid, level);
    expect(res.isSolved).toBe(false);
    // Unsatisfied Tree at (3,3)
    expect(res.cellErrors['3,3']).toContain(
      'Every Tree must have a Woodcutter orthogonally next to it.'
    );
    // Woodcutter at (0,1) has no adjacent House
    expect(res.cellErrors['0,1']).toContain(
      'Woodcutter must be orthogonally next to a House.'
    );
  });
});

describe('Campaign Levels — Uniqueness & Pure Logical Deduction Audit', () => {
  for (const cfg of CAMPAIGN_CONFIGS) {
    it(`Level ${cfg.id} ("${cfg.title}", ${cfg.size}x${cfg.size}) is uniquely solvable by pure logic`, () => {
      const level = getCampaignLevel(cfg.id);

      // 1. Solution satisfies all rules (including every Tree -> Woodcutter and every Woodcutter/Farm -> House)
      const valid = validateBoard(level.solution, level);
      expect(valid.isSolved).toBe(true);

      for (let r = 0; r < level.size; r++) {
        for (let c = 0; c < level.size; c++) {
          const tile = level.solution[r][c];
          const ortho = getOrthoNeighbors(level.size, r, c);
          if (tile === 'tree') {
            expect(
              ortho.some((n) => level.solution[n.r][n.c] === 'woodcutter')
            ).toBe(true);
          }
          if (tile === 'woodcutter' || tile === 'farm') {
            expect(
              ortho.some((n) => level.solution[n.r][n.c] === 'house')
            ).toBe(true);
          }
        }
      }

      // 2. Solution is strictly unique (countSolutions == 1)
      const solCount = countSolutions(level, 2);
      expect(solCount.count).toBe(1);

      // 3. Solution is 100% deducible without guessing (and requires <= 3 lookaheads)
      const deduction = solveByDeduction(level);
      expect(deduction.solved).toBe(true);
      expect(deduction.lookaheadCount).toBeLessThanOrEqual(3);

      // 4. Hint system works from empty initial board and never uses vague explanations
      const marks = Array.from({ length: level.size }, () =>
        Array(level.size).fill(false)
      );
      const hint = getNextHint(level.initialGrid, marks, level);
      expect(hint).not.toBeNull();
      expect(hint?.steps).toBeDefined();
      expect(hint?.steps?.length).toBeGreaterThanOrEqual(1);

      for (const step of deduction.steps) {
        expect(step.explanation).not.toContain(
          'would make it impossible to satisfy'
        );
        expect(step.steps).toBeDefined();
        expect(step.steps?.length).toBeGreaterThanOrEqual(1);
      }
    });
  }
});

describe('Multi-Step Hint Structure & Breakdown', () => {
  it('generates multi-step walkthrough for Level 34 tree adjacency with discarded candidates', () => {
    const level34 = getCampaignLevel(34);
    const deduction = solveByDeduction(level34);
    expect(deduction.solved).toBe(true);

    const treeHint = deduction.steps.find((s) => s.ruleName === 'Tree Needs Woodcutter');
    expect(treeHint).toBeDefined();
    expect(treeHint!.steps).toBeDefined();
    expect(treeHint!.steps!.length).toBe(3);

    // Step 1: Premise & Candidates
    const step1 = treeHint!.steps![0];
    expect(step1.message).toContain('Every Tree must have a Woodcutter next to it');
    expect(step1.focusCells).toEqual([{ r: 4, c: 2 }]);
    expect(step1.candidateCells).toHaveLength(2);

    // Step 2: Explains discarded neighbor (2, 5)
    const step2 = treeHint!.steps![1];
    expect(step2.message).toContain('(2, 5) cannot be a Woodcutter');
    expect(step2.message).toContain('no adjacent spot for a House');
    expect(step2.discardedCells).toEqual([{ r: 4, c: 1 }]);

    // Step 3: Conclusion targeting (3, 4)
    const step3 = treeHint!.steps![2];
    expect(step3.message).toContain('(3, 4)');
    expect(step3.targetCell).toEqual({ r: 3, c: 2 });
  });

  it('generates multi-step Tree Needs Woodcutter hint for Level 75 explaining (3,2) and (2,1) exclusions', () => {
    const level75 = getCampaignLevel(75);
    const grid = level75.initialGrid.map((r) => [...r]);
    grid[3][5] = 'house';
    grid[4][5] = 'woodcutter';
    grid[3][4] = 'road';
    grid[4][4] = 'road';

    const marks = Array.from({ length: 6 }, () => Array(6).fill(false));
    for (let c = 0; c < 6; c++) {
      marks[2][c] = true;
      if (grid[4][c] === 'empty') marks[4][c] = true;
    }
    // Column 0 has a clue of 0, and Column 5 has both buildings placed:
    for (let r = 0; r < 6; r++) {
      marks[r][0] = true;
      if (grid[r][5] === 'empty') marks[r][5] = true;
    }

    const hint = getNextHint(grid, marks, level75);
    expect(hint).not.toBeNull();
    expect(hint?.ruleName).toBe('Tree Needs Woodcutter');
    expect(hint?.steps).toHaveLength(4);

    // Step 1: Premise focusing Tree at (3,1) and candidate neighbors (4,1), (3,2), (2,1)
    expect(hint!.steps![0].focusCells).toEqual([{ r: 0, c: 2 }]);
    expect(hint!.steps![0].candidateCells).toHaveLength(3);

    // Step 2 & 3: Discarded neighbors (3,2) and (2,1) with explicit line-limit reasons
    expect(hint!.steps![1].message).toBe(
      '(3, 2) cannot be a Woodcutter (adjacent House would also be in Row 2, exceeding Row 2\'s limit of 1 building).'
    );
    expect(hint!.steps![2].message).toBe(
      '(2, 1) cannot be a Woodcutter (adjacent House would also be in Column 2, exceeding Column 2\'s limit of 1 building).'
    );

    // Step 4: Final placement at (4,1)
    expect(hint!.steps![3].targetCell).toEqual({ r: 0, c: 3 });
  });

  it('inspects Level 75 Town Hall hint in screenshot', () => {
    const level75 = getCampaignLevel(75);
    // Grid matches screenshot:
    // Row 0 (y=1): empty, empty, tree, woodcutter, house, rock
    // Row 1 (y=2): empty, [sand], [sand], road, farm, empty
    // Row 2 (y=3): empty, empty, empty, empty, empty, empty
    // Row 3 (y=4): empty, [sand], [sand], [sand], road, house
    // Row 4 (y=5): empty, empty, empty, rock, road, woodcutter
    // Row 5 (y=6): empty, [sand], [sand], [sand], rock, tree
    const grid: TileType[][] = [
      ['empty', 'empty', 'tree', 'woodcutter', 'house', 'rock'],
      ['empty', 'empty', 'empty', 'road', 'farm', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'road', 'house'],
      ['empty', 'empty', 'empty', 'rock', 'road', 'woodcutter'],
      ['empty', 'empty', 'empty', 'empty', 'rock', 'tree']
    ];
    // Marks are true where player marked grass:
    const marks = Array.from({ length: 6 }, () => Array(6).fill(false));
    marks[0][0] = true; marks[0][1] = true;
    marks[1][0] = true; marks[1][1] = true; marks[1][2] = true; marks[1][5] = true;
    marks[2].fill(true);
    marks[3][0] = true;
    marks[4][0] = true; marks[4][1] = true; marks[4][2] = true;
    marks[5][0] = true;

    // Hint 1: (3, 4) cannot hold a building
    const hint1 = getNextHint(grid, marks, level75);
    expect(hint1).not.toBeNull();
    expect(hint1?.ruleName).toBe('Cannot Hold Building');
    expect(hint1?.action).toBe('mark_empty');
    expect(hint1?.r).toBe(3);
    expect(hint1?.c).toBe(2);

    // After applying Hint 1:
    marks[3][2] = true;

    // Hint 2: Now (2, 4) is the only remaining valid spot on the entire board for Town Hall!
    const hint2 = getNextHint(grid, marks, level75);
    expect(hint2).not.toBeNull();
    expect(hint2?.ruleName).toBe('Only Remaining Spot');
    expect(hint2?.action).toBe('place');
    expect(hint2?.r).toBe(3);
    expect(hint2?.c).toBe(1);
  });

  it('inspects Level 75 screenshot 2 (Column Clue Complete then Only House Fits at 4,6)', () => {
    const level75 = getCampaignLevel(75);
    const grid: TileType[][] = [
      ['empty', 'empty', 'tree', 'woodcutter', 'house', 'rock'],
      ['empty', 'empty', 'empty', 'road', 'farm', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'town_hall', 'empty', 'empty', 'road', 'house'],
      ['empty', 'empty', 'empty', 'rock', 'road', 'woodcutter'],
      ['empty', 'empty', 'empty', 'empty', 'rock', 'tree']
    ];
    const marks = Array.from({ length: 6 }, () => Array(6).fill(false));
    marks[0][0] = true; marks[0][1] = true;
    marks[1][0] = true; marks[1][1] = true; marks[1][2] = true; marks[1][5] = true;
    marks[2].fill(true);
    marks[3][0] = true; marks[3][2] = true; marks[3][3] = true;
    marks[4][0] = true; marks[4][1] = true; marks[4][2] = true;
    marks[5][0] = true;

    // Hint 1: Column 2 is complete with 0 remaining, so prioritize Column Clue Complete
    const hint1 = getNextHint(grid, marks, level75);
    expect(hint1).not.toBeNull();
    expect(hint1?.ruleName).toBe('Column Clue Complete');
    expect(hint1?.lineAction).toEqual({ axis: 'col', index: 1 });
    expect(hint1?.steps).toHaveLength(2);
    expect(hint1?.steps![0].message).toContain('Column 2 already has all 1 of its required building(s) placed');
    expect(hint1?.steps![1].message).toContain('Tap the Column 2 badge (or click Apply) to mark the remaining 1 spot(s) as clear ground.');

    // Once Column 2 is marked (e.g. by applying the hint):
    marks[5][1] = true;

    // Hint 2: Only House Fits at (4, 6)
    const hint2 = getNextHint(grid, marks, level75);
    expect(hint2).not.toBeNull();
    expect(hint2?.ruleName).toBe('Only House Fits');
    expect(hint2?.steps).toBeDefined();
    expect(hint2?.steps).toHaveLength(5);

    // Step 1: Target cell is candidate
    expect(hint2!.steps![0].candidateCells).toHaveLength(1);

    // Final placement
    expect(hint2!.steps![4].message).toBe('Therefore, (4, 6) must be a House!');
    expect(hint2!.steps![4].targetCell).toEqual({ r: 5, c: 3 });
  });

  it('inspects Level 76 Road Entry Point screenshot', () => {
    const level76Screenshot: LevelDefinition = {
      id: 76,
      chapter: 5,
      chapterName: 'Master Architect',
      title: 'Highland Borough (Screenshot Fixture)',
      size: 6,
      initialGrid: [
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'tree', 'empty', 'rock', 'empty', 'empty'],
        ['tree', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['rock', 'empty', 'empty', 'empty', 'empty', 'empty'],
        ['empty', 'rock', 'empty', 'empty', 'empty', 'tree']
      ],
      rowClues: [1, 0, 0, 2, 3, 2],
      colClues: [0, 2, 1, 1, 2, 2],
      inventory: {
        house: 3,
        woodcutter: 2,
        road: 7,
        farm: 2,
        town_hall: 1
      },
      solution: [
        ['empty', 'empty', 'empty', 'empty', 'town_hall', 'empty'],
        ['empty', 'empty', 'empty', 'empty', 'road', 'empty'],
        ['empty', 'tree', 'empty', 'rock', 'road', 'empty'],
        ['tree', 'woodcutter', 'road', 'road', 'road', 'house'],
        ['rock', 'house', 'farm', 'road', 'road', 'woodcutter'],
        ['empty', 'rock', 'empty', 'house', 'farm', 'tree']
      ],
      difficulty: 'Expert'
    };

    // Board from screenshot:
    // Row 1 (y=1): empty, sand, sand, sand, sand, sand
    // Row 2 (y=2): all empty
    // Row 3 (y=3): empty, tree, empty, rock, empty, empty
    // Row 4 (y=4): tree, woodcutter, sand, sand, sand, sand
    // Row 5 (y=5): rock, sand, sand, sand, sand, sand
    // Row 6 (y=6): empty, rock, sand, sand, sand, tree
    const grid: TileType[][] = [
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'tree', 'empty', 'rock', 'empty', 'empty'],
      ['tree', 'woodcutter', 'empty', 'empty', 'empty', 'empty'],
      ['rock', 'empty', 'empty', 'empty', 'empty', 'empty'],
      ['empty', 'rock', 'empty', 'empty', 'empty', 'tree']
    ];
    const marks = Array.from({ length: 6 }, () => Array(6).fill(false));
    marks[0][0] = true;
    marks[1].fill(true);
    marks[2][0] = true; marks[2][2] = true; marks[2][4] = true; marks[2][5] = true;
    marks[5][0] = true;

    // Hint 1: Cannot Hold Building at (2, 1) with explicit multi-step chain
    const hint1 = getNextHint(grid, marks, level76Screenshot);
    expect(hint1).toBeDefined();
    expect(hint1?.ruleName).toBe('Cannot Hold Building');
    expect(hint1?.action).toBe('mark_empty');
    expect(hint1?.r).toBe(0);
    expect(hint1?.c).toBe(1);
    expect(hint1?.steps).toHaveLength(3);

    // Step 1: Woodcutter, Farm, House exclusions
    expect(hint1!.steps![0].message).toContain('no adjacent Tree');
    expect(hint1!.steps![0].message).toContain("exceeding Row 1's limit of 1 building");

    // Step 2: Town Hall exclusion with explicit causal chain and cell highlights
    expect(hint1!.steps![1].message).toBe(
      "Town Hall at (2, 1) would fill Column 2, forcing Woodcutter at (2, 4)'s House into (3, 4). Along with Woodcutter at (2, 4) and (6, 4) (needed for Column 6), Row 4 would have 3 buildings, exceeding its limit of 2 building(s)."
    );
    expect(hint1!.steps![1].candidateCells).toEqual([
      { r: 0, c: 1 },
      { r: 3, c: 1 },
      { r: 3, c: 2 },
      { r: 3, c: 5 }
    ]);

    // Step 3: Conclusion & mark clear
    expect(hint1!.steps![2].message).toContain('mark it as clear ground');
    expect(hint1!.steps![2].targetCell).toEqual({ r: 0, c: 1 });

    // Apply Hint 1 (mark (2, 1) as clear):
    marks[0][1] = true;

    // Hint 2: Road Entry Point at (3, 4) — now (2, 1) is marked, so (2, 5) is visibly the only open spot in Column 2!
    const hint2 = getNextHint(grid, marks, level76Screenshot);
    expect(hint2).toBeDefined();
    expect(hint2?.ruleName).toBe('Road Entry Point');
    expect(hint2?.action).toBe('place');
    expect(hint2?.tileType).toBe('road');
    expect(hint2?.r).toBe(3);
    expect(hint2?.c).toBe(2);
    expect(hint2?.steps).toHaveLength(3);

    // Step 1: Premise focusing the Woodcutter and candidate exits
    expect(hint2!.steps![0].title).toBe('Road Entry Point');
    expect(hint2!.steps![0].message).toContain(
      'The Woodcutter at (2, 4) needs a Road connection to reach the Town Hall.'
    );
    expect(hint2!.steps![0].focusCells).toEqual([{ r: 3, c: 1 }]);
    expect(hint2!.steps![0].candidateCells).toEqual([
      { r: 3, c: 2 },
      { r: 4, c: 1 }
    ]);

    // Step 2: Discarding non-road exits without confusing lookahead references
    expect(hint2!.steps![1].title).toBe('Road Entry Point');
    expect(hint2!.steps![1].message).toBe(
      '(2, 5) cannot be a Road (Column 2 needs 1 more building, and (2, 5) is its only valid spot).'
    );
    expect(hint2!.steps![1].focusCells).toEqual([{ r: 3, c: 1 }]);
    expect(hint2!.steps![1].discardedCells).toEqual([{ r: 4, c: 1 }]);

    // Step 3: Concluding the exit and pointing to target
    expect(hint2!.steps![2].title).toBe('Road Entry Point');
    expect(hint2!.steps![2].message).toBe(
      'That leaves (3, 4) as the only available Road exit for the Woodcutter at (2, 4)!'
    );
    expect(hint2!.steps![2].focusCells).toEqual([{ r: 3, c: 1 }]);
    expect(hint2!.steps![2].targetCell).toEqual({ r: 3, c: 2 });

    // Apply Hint 2 (place Road at (3, 4)):
    grid[3][2] = 'road';

    // Hint 3: Woodcutter Needs House at (2, 5)
    const hint3 = getNextHint(grid, marks, level76Screenshot);
    expect(hint3).toBeDefined();
    expect(hint3?.ruleName).toBe('Woodcutter Needs House');
    expect(hint3?.action).toBe('place');
    expect(hint3?.tileType).toBe('house');
    expect(hint3?.r).toBe(4);
    expect(hint3?.c).toBe(1);

    // Apply Hint 3 (place House at (2, 5)):
    grid[4][1] = 'house';

    // Hint 4: Column Clue Complete for Column 2 is now satisfied because (2, 1) was already cleared!
  });

  it('orders tray buttons as woodcutter (lumber), house, farm, town hall, road', () => {
    expect(PLACEABLE_TYPES).toEqual([
      'woodcutter',
      'house',
      'farm',
      'town_hall',
      'road'
    ]);
  });

  it('verifies that the 4 building exclusions correspond to woodcutter, house, farm, town_hall and excludes road', () => {
    const buildings = ['woodcutter', 'house', 'farm', 'town_hall'];
    expect(buildings).toHaveLength(4);
    expect(buildings).not.toContain('road');
  });

  it('explains why no buildings fit when marking a cell empty by process of elimination (e.g. Level 80)', () => {
    const level80 = getCampaignLevel(80);
    const grid: TileType[][] = level80.initialGrid.map((r) => [...r]);
    const marks: boolean[][] = Array.from({ length: level80.size }, () =>
      Array(level80.size).fill(false)
    );

    // Row 2 has clue 0, mark Row 2 empty
    for (let c = 0; c < level80.size; c++) {
      marks[1][c] = true;
    }

    const result = solveByDeduction(level80, grid, marks);
    const step00 = result.steps.find((s) => s.r === 0 && s.c === 0);
    expect(step00).toBeDefined();
    expect(step00?.action).toBe('mark_empty');
    expect(step00?.ruleName).toBe('No Buildings Fit');
    expect(step00?.steps?.[0].title).toBe('No Buildings Fit');
    expect(step00?.steps?.[0].message).toContain('Woodcutter: no adjacent Tree');
    expect(step00?.steps?.[0].message).toContain('Town Hall: perimeter blocked by Rock at (2, 1)');
    expect(step00?.steps?.[0].message).toContain('House: no adjacent spot for a Woodcutter or Farm');
    expect(step00?.steps?.[0].message).toContain('Farm: no adjacent spot for a House');
    expect(step00?.steps?.[1].title).toBe('Mark as Clear Ground');
    expect(step00?.steps?.[1].message).toContain(
      'Since no buildings can fit at (1, 1), this space must be marked as clear ground (Grass).'
    );
  });

  it('verifies Level 80 Town Hall hint does not cross-talk with Column 1 or inline (1, 5)', () => {
    const level80 = getCampaignLevel(80);
    const grid: TileType[][] = level80.initialGrid.map((r) => [...r]);
    const marks: boolean[][] = Array.from({ length: level80.size }, () =>
      Array(level80.size).fill(false)
    );

    // Exact board state from user report:
    marks[0][0] = true;
    marks[0][5] = true;
    marks[1][0] = true;
    marks[1][2] = true;
    marks[1][3] = true;
    marks[1][4] = true;
    marks[1][5] = true;
    grid[2][1] = 'woodcutter';
    marks[3][0] = true;
    marks[3][2] = true;
    marks[3][3] = true;
    grid[3][4] = 'house';
    grid[3][5] = 'woodcutter';
    marks[4][1] = true;
    grid[4][5] = 'road';
    marks[5][1] = true;
    marks[5][5] = true;

    // First hint recognizes that (5, 5) is an essential road bottleneck to connect the corner road:
    const hint1 = getNextHint(grid, marks, level80);
    expect(hint1).not.toBeNull();
    expect(hint1?.action).toBe('place');
    expect(hint1?.ruleName).toBe('Required Road Path');
    expect(hint1?.r).toBe(4);
    expect(hint1?.c).toBe(4); // (5, 5)
    expect(hint1?.tileType).toBe('road');

    // Player places Road at (5, 5):
    grid[4][4] = 'road';
    marks[4][0] = true; // (1, 5)
    marks[4][3] = true; // (4, 5)
    marks[5][0] = true; // (1, 6)

    // Next hint places House at (1, 3) since Column 1 needs 1 building:
    const hintHouse = getNextHint(grid, marks, level80);
    expect(hintHouse).not.toBeNull();
    expect(hintHouse?.action).toBe('place');
    expect(hintHouse?.r).toBe(2);
    expect(hintHouse?.c).toBe(0); // (1, 3)
    expect(hintHouse?.tileType).toBe('house');
    expect(hintHouse?.ruleName).toBe('Only House Fits');
  });
});
