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

  // -------------------------------------------------------------------------
  // CHAPTER 6: WINDMILL RIDGE (Levels 101 to 125)
  // Focus: Windmills adjacent to Farms & Grand 7x7 Layouts
  // -------------------------------------------------------------------------
  const ch6Titles = [
    'Breezy Bluff',
    'Millstone Meadow',
    'Turning Sails',
    'Graincrest Hill',
    'Windward Acres',
    'Miller’s Rise',
    'Zephyr Grange',
    'Four-Winds Crossing',
    'Flourish Vale',
    'Highwind Terrace',
    'Golden Vane',
    'Gale’s Rest',
    'Seven-Shire Plain',
    'Broadleaf Shire',
    'Tailwind Commons',
    'Harvest Spire',
    'Sunburst Valley',
    'Millwright Ward',
    'Westwind Basin',
    'Amber Panorama',
    'Skyline Granary',
    'Sovereign Wind',
    'Grand Millworks',
    'Horizon Heartland',
    'Summit of the Winds'
  ];

  for (let i = 101; i <= 125; i++) {
    const idx = i - 101;
    const isIntro5x5 = idx < 4;
    const isMid6x6 = idx >= 4 && idx < 12;
    const size = isIntro5x5 ? 5 : isMid6x6 ? 6 : 7;

    configs.push({
      id: i,
      chapter: 6,
      chapterName: 'Windmill Ridge',
      title: ch6Titles[idx],
      size,
      buildings: isIntro5x5
        ? {
            town_hall: idx >= 2 ? 1 : 0,
            woodcutter: 2,
            farm: 1,
            windmill: 1,
            house: 2
          }
        : isMid6x6
          ? {
              town_hall: 1,
              woodcutter: 2,
              farm: 2,
              windmill: idx >= 8 ? 2 : 1,
              house: 2
            }
          : {
              town_hall: 1,
              woodcutter: idx >= 20 ? 3 : 2,
              farm: 2,
              windmill: 2,
              house: 3
            },
      extraTrees: size === 7 ? 2 : 1,
      rocks: size === 7 ? 3 : 2,
      allowTurningRoads: !isIntro5x5 || idx >= 2,
      minDensity: isIntro5x5 ? 0.44 : isMid6x6 ? 0.46 : 0.42,
      tutorialTip:
        i === 101
          ? 'New Building — Windmill: Every Windmill must be orthogonally next to a Farm! It does not require a House or Road of its own.'
          : i === 113
            ? 'Welcome to 7×7 Grand Villages! Use the line clues and 3-building Farm + House + Windmill clusters to narrow down large spaces.'
            : undefined
    });
  }

  // -------------------------------------------------------------------------
  // CHAPTER 7: GRAND HEARTLAND (Levels 126 to 150)
  // Focus: Full 7x7 Master Kingdoms with Windmills, Farms, Woodcutters & Town Hall
  // -------------------------------------------------------------------------
  const ch7Titles = [
    'Heartland Gate',
    'Seven-Mill Reach',
    'Golden Granary',
    'Highshire Commons',
    'Windmill Valley',
    'Royal Wheatfields',
    'Timber & Sails',
    'Sovereign Meadow',
    'Great Mill Basin',
    'Crownlands Crossing',
    'Harvest Citadel',
    'Grand Windward',
    'Bountiful Realm',
    'King’s Granary',
    'Sunlit Dominion',
    'Miller’s Capital',
    'Four-Vane Bastion',
    'Emerald Heartland',
    'Highwind Metropolis',
    'Imperial Harvest',
    'Golden Shire Spire',
    'Archduke’s Grange',
    'Zenith of the Winds',
    'Grand Kingdom',
    'Crown of PuzzleTown'
  ];

  for (let i = 126; i <= 150; i++) {
    const idx = i - 126;
    const isMid = idx >= 8 && idx < 17;
    const isLate = idx >= 17;

    configs.push({
      id: i,
      chapter: 7,
      chapterName: 'Grand Heartland',
      title: ch7Titles[idx],
      size: 7,
      buildings: isLate
        ? {
            town_hall: 1,
            woodcutter: 3,
            farm: 2,
            windmill: 2,
            house: 4
          }
        : isMid
          ? {
              town_hall: 1,
              woodcutter: 3,
              farm: 2,
              windmill: 2,
              house: 3
            }
          : {
              town_hall: 1,
              woodcutter: 2,
              farm: 2,
              windmill: 2,
              house: 3
            },
      extraTrees: 2,
      rocks: 3,
      allowTurningRoads: true,
      minDensity: isLate ? 0.46 : isMid ? 0.44 : 0.42
    });
  }

  return configs;
}

export const CAMPAIGN_CONFIGS: GeneratorConfig[] = build100Configs();

export const PREBAKED_LEVELS: LevelDefinition[] = (
  prebakedData as unknown as LevelDefinition[]
).map((lvl) => ({
  ...lvl,
  inventory: {
    ...lvl.inventory,
    windmill: lvl.inventory.windmill ?? 0
  }
}));

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
  size: 5 | 6 | 7,
  seed: number
): LevelDefinition {
  const cfg: GeneratorConfig = {
    id: 200 + (seed % 800),
    chapter: 7,
    chapterName: 'Bonus Charter',
    title: `Charter #${200 + (seed % 800)}`,
    size,
    buildings:
      size === 5
        ? { town_hall: 1, woodcutter: 2, farm: 1, windmill: 1, house: 2 }
        : size === 6
          ? { town_hall: 1, woodcutter: 2, farm: 2, windmill: 1, house: 3 }
          : { town_hall: 1, woodcutter: 2, farm: 2, windmill: 2, house: 3 },
    extraTrees: size === 7 ? 2 : 1,
    rocks: size === 7 ? 3 : 2,
    allowTurningRoads: true,
    difficulty: size === 5 ? 'Medium' : size === 6 ? 'Hard' : 'Expert'
  };
  return generateVerifiedLevel(cfg, seed);
}
