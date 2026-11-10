import { generateVerifiedLevel, GeneratorConfig } from './generator';
import prebakedData from './prebakedLevels.json';
import { LevelDefinition } from './types';

export function build100Configs(): GeneratorConfig[] {
  const configs: GeneratorConfig[] = [];

  // -------------------------------------------------------------------------
  // CHAPTER 1: WOODLAND CAMP (Levels 1 to 15)
  // Focus: Trees, Woodcutters, Houses (Densely populated forest hamlets)
  // -------------------------------------------------------------------------
  const ch1Titles = [
    'First Clearing',
    'Timber Line',
    'Twin Cabins',
    'Pine Grove',
    'Cozy Copse',
    'Woodsman Path',
    'Birch Hollow',
    'Forest Border',
    'Lumber Haven',
    'Cedar Glen',
    'Highland Lumber',
    'Shadow Woods',
    'Oakwood Rise',
    'Dense Thicket',
    'Old Forest Hold'
  ];

  for (let i = 1; i <= 15; i++) {
    const size = i <= 7 ? 4 : 5;
    const isSmall = size === 4;
    configs.push({
      id: i,
      chapter: 1,
      chapterName: 'Woodland Camp',
      title: ch1Titles[i - 1],
      size,
      buildings: isSmall
        ? { town_hall: 0, woodcutter: 2, farm: 0, house: 2 }
        : { town_hall: 0, woodcutter: 3, farm: 0, house: 3 },
      extraTrees: isSmall ? (i >= 4 ? 1 : 0) : i >= 12 ? 2 : 1,
      rocks: isSmall ? (i >= 4 ? 1 : 0) : i >= 10 ? 2 : 1,
      minDensity: isSmall ? (i <= 3 ? 0.38 : 0.46) : i <= 11 ? 0.44 : 0.50,
      tutorialTip:
        i === 1
          ? 'Welcome to PuzzleTown! Every Tree must have a Woodcutter orthogonally next to it, and every Woodcutter must have a House next to it. Numbers show how many more buildings are needed!'
          : i === 2
          ? 'Remember: No row or column can have two of the SAME building type, and two buildings of the same type can never touch (even diagonally)!'
          : i === 3
          ? 'Tip: Use the "🚫 Not Here" tool to mark cells where you know no building can go!'
          : undefined
    });
  }

  // -------------------------------------------------------------------------
  // CHAPTER 2: HARVEST FIELDS (Levels 16 to 35)
  // Focus: Introducing Farms alongside Woodcutters & Houses (5x5)
  // -------------------------------------------------------------------------
  const ch2Titles = [
    'Fertile Soil',
    'Golden Wheat',
    'Barley Field',
    'Orchard Ridge',
    'Homestead Valley',
    'Bountiful Acres',
    'Silo Corner',
    'Rustic Grange',
    'Pasture Edge',
    'Sunlit Prairie',
    'Clover Meadow',
    'Haystack Hill',
    'Autumn Wind',
    'Farmer’s Rest',
    'Tilled Terrace',
    'Windmill Bluff',
    'Granary Plain',
    'Rye Crossing',
    'Cornflower Vale',
    'Grand Harvest'
  ];

  for (let i = 16; i <= 35; i++) {
    const idx = i - 16;
    const isDense = idx >= 10;
    const isLate = idx >= 15;
    configs.push({
      id: i,
      chapter: 2,
      chapterName: 'Harvest Fields',
      title: ch2Titles[idx],
      size: 5,
      buildings: {
        town_hall: 0,
        woodcutter: isLate ? 3 : 2,
        farm: idx < 6 ? 1 : 2,
        house: isDense ? 3 : 2
      },
      extraTrees: idx >= 8 ? 2 : 1,
      rocks: idx >= 6 ? 2 : 1,
      minDensity: idx < 6 ? 0.40 : idx < 12 ? 0.46 : 0.50,
      tutorialTip:
        i === 16
          ? 'New Building — Farm: Every Woodcutter AND Farm must have a House orthogonally next to it. A House can sit between both to satisfy both!'
          : undefined
    });
  }

  // -------------------------------------------------------------------------
  // CHAPTER 3: TOWN CHARTER (Levels 36 to 55)
  // Focus: Town Hall & Turning Roads (5x5)
  // -------------------------------------------------------------------------
  const ch3Titles = [
    'Founding the Hall',
    'Winding Plankway',
    'Civic Square',
    'Mayor’s Boundary',
    'Crossroad Commons',
    'Cobble Spur',
    'Timberway Junction',
    'Borough Charter',
    'Town Hall Commons',
    'Guildhall Reach',
    'Council Creek',
    'Lantern Way',
    'Charter Stone',
    'Paved Causeway',
    'Old Tollgate',
    'Watchman Turn',
    'Belfry Square',
    'Market Approach',
    'Alderman Gate',
    'Crown Charter'
  ];

  for (let i = 36; i <= 55; i++) {
    const idx = i - 36;
    const hasFarm = idx >= 6;
    configs.push({
      id: i,
      chapter: 3,
      chapterName: 'Town Charter',
      title: ch3Titles[idx],
      size: 5,
      buildings: {
        town_hall: 1,
        woodcutter: 2,
        farm: hasFarm ? 1 : 0,
        house: hasFarm ? 3 : 2
      },
      extraTrees: 1,
      rocks: idx >= 8 ? 2 : 1,
      allowTurningRoads: true,
      minDensity: hasFarm ? 0.50 : 0.44,
      tutorialTip:
        i === 36
          ? 'New Building — Town Hall & Roads: Town Hall requires its 8 surrounding squares to be clear of buildings, trees, and rocks! Woodcutters and Farms connect to it via Roads.'
          : undefined
    });
  }

  // -------------------------------------------------------------------------
  // CHAPTER 4: BUSTLING VILLAGE (Levels 56 to 75)
  // Focus: Full building roster + connected village layouts (5x5 & 6x6)
  // -------------------------------------------------------------------------
  const ch4Titles = [
    'Market Day',
    'Miller’s Bend',
    'Stonemason Way',
    'Cobble Basin',
    'Briarwood Trade',
    'Riverbridge Reach',
    'Granary Junction',
    'Copperleaf Row',
    'Tavern Yard',
    'Merchant Run',
    'Six-Shire Crossing',
    'Cobblestone Reach',
    'High Borough',
    'Falconer Crest',
    'Old Mill Quarter',
    'Weaver’s Crossing',
    'Timberline Ward',
    'Cartwright Plaza',
    'Baron’s Gate',
    'The Great Commons'
  ];

  for (let i = 56; i <= 75; i++) {
    const idx = i - 56;
    const is6x6 = idx >= 10;
    configs.push({
      id: i,
      chapter: 4,
      chapterName: 'Bustling Village',
      title: ch4Titles[idx],
      size: is6x6 ? 6 : 5,
      buildings: is6x6
        ? { town_hall: 1, woodcutter: 2, farm: 2, house: 3 }
        : { town_hall: 1, woodcutter: 2, farm: 1, house: 2 },
      extraTrees: 1,
      rocks: is6x6 ? 2 : 1,
      allowTurningRoads: true,
      minDensity: is6x6 ? 0.48 : 0.46
    });
  }

  // -------------------------------------------------------------------------
  // CHAPTER 5: MASTER ARCHITECT (Levels 76 to 100)
  // Focus: High-density 6x6 master layouts (50% - 68% density)
  // -------------------------------------------------------------------------
  const ch5Titles = [
    'Highland Borough',
    'King’s Highway',
    'Emerald Basin',
    'Old Oak Stronghold',
    'Merchant’s Guild',
    'Crown Province',
    'Grand Capital',
    'Castle Hill',
    'Sovereign Spire',
    'Archon’s Reach',
    'Royal Citadel',
    'Cathedral Ward',
    'Imperial Crossing',
    'Duchy Stronghold',
    'Prince’s Bastion',
    'Chamberlain Way',
    'Palace Gardens',
    'Monument Terrace',
    'St. Jude’s Quarter',
    'High Chancellor',
    'King’s Fortress',
    'Imperial Court',
    'Crown Zenith',
    'Grand Metropolis',
    'The Eternal City'
  ];

  for (let i = 76; i <= 100; i++) {
    const idx = i - 76;
    const isExpert = idx >= 12;
    configs.push({
      id: i,
      chapter: 5,
      chapterName: 'Master Architect',
      title: ch5Titles[idx],
      size: 6,
      buildings: isExpert
        ? { town_hall: 1, woodcutter: 3, farm: 2, house: 3 }
        : { town_hall: 1, woodcutter: 2, farm: 2, house: 3 },
      extraTrees: idx % 2 === 0 ? 2 : 1,
      rocks: isExpert ? 2 : 2,
      allowTurningRoads: true,
      minDensity: isExpert ? 0.50 : 0.48
    });
  }

  return configs;
}

export const CAMPAIGN_CONFIGS: GeneratorConfig[] = build100Configs();

export const PREBAKED_LEVELS: LevelDefinition[] = prebakedData as unknown as LevelDefinition[];

const levelCache = new Map<number, LevelDefinition>();

// Seed cache with prebaked levels
for (const lvl of PREBAKED_LEVELS) {
  levelCache.set(lvl.id, lvl);
}

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
