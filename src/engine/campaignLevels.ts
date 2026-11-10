import { generateVerifiedLevel, GeneratorConfig } from './generator';
import { LevelDefinition } from './types';

export const CAMPAIGN_CONFIGS: GeneratorConfig[] = [
  // =========================================================================
  // CHAPTER 1: WOODLAND CAMP (Woodcutters & Houses — Learning the Basics)
  // =========================================================================
  {
    id: 1,
    chapter: 1,
    chapterName: 'Woodland Camp',
    title: 'First Clearing',
    size: 4,
    buildings: { town_hall: 0, woodcutter: 2, farm: 0, house: 2 },
    extraTrees: 0,
    rocks: 0,
    difficulty: 'Easy',
    tutorialTip:
      'Welcome to PuzzleTown! Every Tree must have a Woodcutter orthogonally next to it, and every Woodcutter must have a House next to it. Row & Column numbers count down how many more buildings are needed in that line!'
  },
  {
    id: 2,
    chapter: 1,
    chapterName: 'Woodland Camp',
    title: 'Timber Line',
    size: 4,
    buildings: { town_hall: 0, woodcutter: 2, farm: 0, house: 2 },
    extraTrees: 0,
    rocks: 1,
    difficulty: 'Easy',
    tutorialTip:
      'Remember: No row or column can have two of the SAME building type, and two buildings of the same type can never touch (even diagonally)!'
  },
  {
    id: 3,
    chapter: 1,
    chapterName: 'Woodland Camp',
    title: 'Twin Cabins',
    size: 4,
    buildings: { town_hall: 0, woodcutter: 2, farm: 0, house: 2 },
    extraTrees: 1,
    rocks: 1,
    difficulty: 'Easy',
    tutorialTip:
      'Tip: Right-click (or toggle the "Mark X" tool) to mark tiles where you know no building can go!'
  },
  {
    id: 4,
    chapter: 1,
    chapterName: 'Woodland Camp',
    title: 'Forest Edge',
    size: 5,
    buildings: { town_hall: 0, woodcutter: 2, farm: 0, house: 2 },
    extraTrees: 0,
    rocks: 1,
    difficulty: 'Easy'
  },
  {
    id: 5,
    chapter: 1,
    chapterName: 'Woodland Camp',
    title: 'Lumberjack Hamlet',
    size: 5,
    buildings: { town_hall: 0, woodcutter: 3, farm: 0, house: 3 },
    extraTrees: 0,
    rocks: 1,
    difficulty: 'Medium'
  },

  // =========================================================================
  // CHAPTER 2: HARVEST FIELDS (Introducing Farms)
  // =========================================================================
  {
    id: 6,
    chapter: 2,
    chapterName: 'Harvest Fields',
    title: 'Fertile Soil',
    size: 4,
    buildings: { town_hall: 0, woodcutter: 1, farm: 1, house: 2 },
    extraTrees: 0,
    rocks: 1,
    difficulty: 'Easy',
    tutorialTip:
      'New Building — Farm: Every Woodcutter AND every Farm must have a House orthogonally next to it! A single House can even sit between a Woodcutter and a Farm to serve both.'
  },
  {
    id: 7,
    chapter: 2,
    chapterName: 'Harvest Fields',
    title: 'Golden Wheat',
    size: 5,
    buildings: { town_hall: 0, woodcutter: 2, farm: 1, house: 2 },
    extraTrees: 0,
    rocks: 1,
    difficulty: 'Medium'
  },
  {
    id: 8,
    chapter: 2,
    chapterName: 'Harvest Fields',
    title: 'Orchard Ridge',
    size: 5,
    buildings: { town_hall: 0, woodcutter: 2, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 1,
    difficulty: 'Medium'
  },
  {
    id: 9,
    chapter: 2,
    chapterName: 'Harvest Fields',
    title: 'Homestead Valley',
    size: 5,
    buildings: { town_hall: 0, woodcutter: 3, farm: 2, house: 3 },
    extraTrees: 0,
    rocks: 1,
    difficulty: 'Medium'
  },
  {
    id: 10,
    chapter: 2,
    chapterName: 'Harvest Fields',
    title: 'Bountiful Acres',
    size: 5,
    buildings: { town_hall: 0, woodcutter: 3, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 2,
    difficulty: 'Medium'
  },

  // =========================================================================
  // CHAPTER 3: TOWN CHARTER (Introducing Town Hall & Turning Roads)
  // =========================================================================
  {
    id: 11,
    chapter: 3,
    chapterName: 'Town Charter',
    title: 'Founding the Hall',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 1, farm: 0, house: 1 },
    extraTrees: 0,
    rocks: 1,
    difficulty: 'Easy',
    tutorialTip:
      'New Buildings — Town Hall & Roads: The Town Hall cannot have ANY buildings, trees, or rocks in its 8 surrounding squares! Woodcutters and Farms must connect to the Town Hall via an orthogonal path of Road tiles (which can turn corners). Roads do NOT count toward row/column building numbers.'
  },
  {
    id: 12,
    chapter: 3,
    chapterName: 'Town Charter',
    title: 'Winding Plankway',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 2, farm: 0, house: 2 },
    extraTrees: 0,
    rocks: 1,
    allowTurningRoads: true,
    difficulty: 'Medium',
    tutorialTip:
      'Roads can turn 90° corners and branch to connect multiple buildings to the Town Hall! Use the exact Road count in the tray to deduce the path.'
  },
  {
    id: 13,
    chapter: 3,
    chapterName: 'Town Charter',
    title: 'Civic Square',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 2, farm: 0, house: 2 },
    extraTrees: 1,
    rocks: 1,
    allowTurningRoads: true,
    difficulty: 'Medium'
  },
  {
    id: 14,
    chapter: 3,
    chapterName: 'Town Charter',
    title: 'Lumber Route',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 2, farm: 0, house: 2 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Medium'
  },
  {
    id: 15,
    chapter: 3,
    chapterName: 'Town Charter',
    title: 'Mayor’s Clearing',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 2, farm: 1, house: 2 },
    extraTrees: 0,
    rocks: 1,
    allowTurningRoads: true,
    difficulty: 'Medium'
  },
  {
    id: 16,
    chapter: 3,
    chapterName: 'Town Charter',
    title: 'Crossroad Commons',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 2, farm: 1, house: 2 },
    extraTrees: 1,
    rocks: 1,
    allowTurningRoads: true,
    difficulty: 'Hard'
  },

  // =========================================================================
  // CHAPTER 4: BUSTLING VILLAGE (All Buildings + Turning Roads on 5x5 & 6x6)
  // =========================================================================
  {
    id: 17,
    chapter: 4,
    chapterName: 'Bustling Village',
    title: 'Market Day',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 1, farm: 2, house: 2 },
    extraTrees: 0,
    rocks: 1,
    allowTurningRoads: true,
    difficulty: 'Medium'
  },
  {
    id: 18,
    chapter: 4,
    chapterName: 'Bustling Village',
    title: 'Millers Bend',
    size: 5,
    buildings: { town_hall: 1, woodcutter: 2, farm: 1, house: 2 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Hard'
  },
  {
    id: 19,
    chapter: 4,
    chapterName: 'Bustling Village',
    title: 'Six-Shire Crossing',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 2, farm: 1, house: 2 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Medium'
  },
  {
    id: 20,
    chapter: 4,
    chapterName: 'Bustling Village',
    title: 'Cobblestone Reach',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 2, farm: 2, house: 2 },
    extraTrees: 0,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Hard'
  },
  {
    id: 21,
    chapter: 4,
    chapterName: 'Bustling Village',
    title: 'Briarwood Trade',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 2, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Hard'
  },
  {
    id: 22,
    chapter: 4,
    chapterName: 'Bustling Village',
    title: 'Granary Junction',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 3, farm: 1, house: 3 },
    extraTrees: 0,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Hard'
  },
  {
    id: 23,
    chapter: 4,
    chapterName: 'Bustling Village',
    title: 'Stonemason Valley',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 2, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 3,
    allowTurningRoads: true,
    difficulty: 'Hard'
  },

  // =========================================================================
  // CHAPTER 5: MASTER ARCHITECT (Complex 6x6 Challenges)
  // =========================================================================
  {
    id: 24,
    chapter: 5,
    chapterName: 'Master Architect',
    title: 'Highland Borough',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 3, farm: 1, house: 3 },
    extraTrees: 0,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Hard'
  },
  {
    id: 25,
    chapter: 5,
    chapterName: 'Master Architect',
    title: 'King’s Highway',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 3, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Expert'
  },
  {
    id: 26,
    chapter: 5,
    chapterName: 'Master Architect',
    title: 'Emerald Basin',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 2, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Expert'
  },
  {
    id: 27,
    chapter: 5,
    chapterName: 'Master Architect',
    title: 'Old Oak Stronghold',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 3, farm: 1, house: 3 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Expert'
  },
  {
    id: 28,
    chapter: 5,
    chapterName: 'Master Architect',
    title: 'Merchant’s Guild',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 2, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 3,
    allowTurningRoads: true,
    difficulty: 'Expert'
  },
  {
    id: 29,
    chapter: 5,
    chapterName: 'Master Architect',
    title: 'Crown Province',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 2, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Expert'
  },
  {
    id: 30,
    chapter: 5,
    chapterName: 'Master Architect',
    title: 'Grand Capital',
    size: 6,
    buildings: { town_hall: 1, woodcutter: 3, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: 'Expert'
  }
];

const levelCache = new Map<number, LevelDefinition>();

export function getCampaignLevel(id: number): LevelDefinition {
  if (levelCache.has(id)) {
    return levelCache.get(id)!;
  }
  const cfg = CAMPAIGN_CONFIGS.find((c) => c.id === id);
  if (!cfg) {
    throw new Error(`Unknown campaign level id: ${id}`);
  }
  const level = generateVerifiedLevel(cfg, id * 104729 + 7919);
  levelCache.set(id, level);
  return level;
}

export function generateBonusCustomLevel(
  size: 5 | 6,
  seed: number
): LevelDefinition {
  const cfg: GeneratorConfig = {
    id: 100 + (seed % 900),
    chapter: 6,
    chapterName: 'Bonus Charter',
    title: `Charter #${100 + (seed % 900)}`,
    size,
    buildings:
      size === 5
        ? { town_hall: 1, woodcutter: 2, farm: 1, house: 2 }
        : { town_hall: 1, woodcutter: 2, farm: 2, house: 3 },
    extraTrees: 1,
    rocks: 2,
    allowTurningRoads: true,
    difficulty: size === 5 ? 'Medium' : 'Hard'
  };
  return generateVerifiedLevel(cfg, seed);
}
