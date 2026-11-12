export type TileType =
  | 'empty'
  | 'tree'
  | 'rock'
  | 'woodcutter'
  | 'house'
  | 'farm'
  | 'town_hall'
  | 'road';

export type BuildingType = 'woodcutter' | 'house' | 'farm' | 'town_hall';

export type PlaceableType = BuildingType | 'road';

export const BUILDING_TYPES: BuildingType[] = [
  'woodcutter',
  'house',
  'farm',
  'town_hall'
];

export const PLACEABLE_TYPES: PlaceableType[] = [
  'woodcutter',
  'house',
  'farm',
  'town_hall',
  'road'
];

export function isBuilding(tile: TileType): tile is BuildingType {
  return (
    tile === 'woodcutter' ||
    tile === 'house' ||
    tile === 'farm' ||
    tile === 'town_hall'
  );
}

export function isPlaceable(tile: TileType): tile is PlaceableType {
  return isBuilding(tile) || tile === 'road';
}

export function isFixedObstacle(tile: TileType): boolean {
  return tile === 'tree' || tile === 'rock';
}

export interface Coord {
  r: number;
  c: number;
}

export interface DifficultyMetrics {
  score: number;
  tier: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  maxRuleLevel: number;
  maxRuleName: string;
  stepCount: number;
  density: number;
  filledTiles: number;
  lookaheadCount?: number;
}

export interface LevelDefinition {
  id: number;
  chapter: number;
  chapterName: string;
  title: string;
  size: number;
  initialGrid: TileType[][];
  rowClues: number[];
  colClues: number[];
  inventory: Record<PlaceableType, number>;
  solution: TileType[][];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  difficultyScore?: number;
  difficultyMetrics?: DifficultyMetrics;
  density?: number;
  tutorialTip?: string;
}

export type LineStatus = 'under' | 'exact' | 'over';

export interface BoardValidationResult {
  isComplete: boolean;
  isSolved: boolean;
  cellErrors: Record<string, string[]>;
  cellSatisfied: Record<string, boolean>;
  rowStatus: LineStatus[];
  colStatus: LineStatus[];
  rowCounts: number[];
  colCounts: number[];
  remainingInventory: Record<PlaceableType, number>;
}

export interface HintStep {
  title?: string;
  message: string;
  focusCells?: Coord[];
  candidateCells?: Coord[];
  discardedCells?: Coord[];
  targetCell?: Coord;
  highlightLine?: { axis: 'row' | 'col'; index: number };
}

export interface DeductionHint {
  r: number;
  c: number;
  action: 'place' | 'mark_empty' | 'mark_building';
  lineAction?: { axis: 'row' | 'col'; index: number };
  tileType?: PlaceableType;
  ruleName: string;
  explanation: string;
  steps?: HintStep[];
}

export const BUILDING_METADATA: Record<
  PlaceableType,
  {
    name: string;
    shortName: string;
    description: string;
  }
> = {
  house: {
    name: 'House',
    shortName: 'House',
    description:
      'Must be orthogonally next to a Woodcutter or Farm. Every Woodcutter and Farm needs a House next to it! Max 1 House per row/col; no two Houses may touch.'
  },
  woodcutter: {
    name: 'Woodcutter',
    shortName: 'Lumber',
    description:
      'Must be orthogonally next to a Tree AND a House, and connected by a Road path to the Town Hall (when present). Every Tree must have a Woodcutter next to it!'
  },
  road: {
    name: 'Road Path',
    shortName: 'Road',
    description:
      'Connects Woodcutters and Farms orthogonally to the Town Hall (can turn corners). Does not count toward row/column building totals.'
  },
  farm: {
    name: 'Farm',
    shortName: 'Farm',
    description:
      'Must be orthogonally next to a House, and connected by a Road path to the Town Hall (when present). Max 1 per row/col; no two Farms may touch.'
  },
  town_hall: {
    name: 'Town Hall',
    shortName: 'Town Hall',
    description:
      'Cannot have any Buildings, Trees, or Rocks in its 8 surrounding squares. Roads may connect orthogonally to it.'
  }
};
