import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_CONFIGS,
  getCampaignLevel
} from '../src/engine/campaignLevels';
import { countSolutions, getNextHint, solveByDeduction } from '../src/engine/solver';
import { LevelDefinition, TileType } from '../src/engine/types';
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

      // 3. Solution is 100% deducible without guessing
      const deduction = solveByDeduction(level);
      expect(deduction.solved).toBe(true);

      // 4. Hint system works from empty initial board and never uses vague explanations
      const marks = Array.from({ length: level.size }, () =>
        Array(level.size).fill(false)
      );
      const hint = getNextHint(level.initialGrid, marks, level);
      expect(hint).not.toBeNull();
      for (const step of deduction.steps) {
        expect(step.explanation).not.toContain(
          'would make it impossible to satisfy'
        );
      }
    });
  }
});
