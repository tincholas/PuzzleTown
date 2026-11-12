import React, { useEffect, useState } from 'react';
import { TileType } from '../engine/types';

import bunnyImg from '../assets/Decorations/bunny.png';
import bushImg from '../assets/Decorations/bush.png';
import butterflyImg from '../assets/Decorations/butterfly.png';
import chickenImg from '../assets/Decorations/chicken.png';
import duckImg from '../assets/Decorations/duck.png';
import fernsImg from '../assets/Decorations/ferns.png';
import flowersImg from '../assets/Decorations/flowers.png';
import flowers2Img from '../assets/Decorations/flowers2.png';
import flowers3Img from '../assets/Decorations/flowers3.png';
import flowers4Img from '../assets/Decorations/flowers4.png';
import goatImg from '../assets/Decorations/goat.png';
import mushroomsImg from '../assets/Decorations/mushrooms.png';
import pigImg from '../assets/Decorations/pig.png';
import sheepImg from '../assets/Decorations/sheep.png';
import sunflowersImg from '../assets/Decorations/sunflowers.png';
import tuftsImg from '../assets/Decorations/tufts.png';

export {
  bunnyImg,
  butterflyImg,
  chickenImg,
  duckImg,
  goatImg,
  sheepImg,
  pigImg
};

export type FloraType =
  | 'flowers'
  | 'flowers2'
  | 'flowers3'
  | 'flowers4'
  | 'sunflowers'
  | 'ferns'
  | 'bush'
  | 'mushrooms'
  | 'tufts';

export type GroundFaunaSpecies = 'chicken' | 'duck' | 'goat' | 'sheep';

export type FaunaType = 'bunny' | 'butterfly' | GroundFaunaSpecies | 'pig';

const FLORA_MAP: Record<FloraType, string> = {
  flowers: flowersImg,
  flowers2: flowers2Img,
  flowers3: flowers3Img,
  flowers4: flowers4Img,
  sunflowers: sunflowersImg,
  ferns: fernsImg,
  bush: bushImg,
  mushrooms: mushroomsImg,
  tufts: tuftsImg
};

const FLORA_KEYS: FloraType[] = [
  'flowers',
  'flowers2',
  'flowers3',
  'flowers4',
  'sunflowers',
  'ferns',
  'bush',
  'mushrooms',
  'tufts'
];

/**
 * Deterministically decides if a marked-empty tile should display flora.
 * Spawns on ~24% of empty tiles.
 */
export function getTileFlora(levelId: number, r: number, c: number): FloraType | null {
  const hash = ((r * 37 + c * 83 + levelId * 19) ^ 0x4a7) % 100;
  if (hash < 24) {
    const floraIdx = (r * 13 + c * 29 + levelId * 7) % FLORA_KEYS.length;
    return FLORA_KEYS[floraIdx];
  }
  return null;
}

export interface GroundFaunaTileState {
  species: GroundFaunaSpecies;
  r: number;
  c: number;
  facingLeft: boolean;
  isWalking: boolean;
  fromDelta?: { dx: number; dy: number };
}

// Backward-compatibility alias
export type ChickenTileState = GroundFaunaTileState;

export interface ButterflyTileState {
  r: number;
  c: number;
  isFlying: boolean;
  fromDelta?: { dx: number; dy: number };
}

export interface FaunaManagerResult {
  bunnyTree: { r: number; c: number; peekDir: 'left' | 'right' } | null;
  groundFauna: GroundFaunaTileState | null;
  chicken: GroundFaunaTileState | null; // alias for backwards compatibility
  butterfly: ButterflyTileState | null;
}

const GROUND_SPECIES_ROSTER: GroundFaunaSpecies[] = ['chicken', 'duck', 'sheep', 'goat'];

/**
 * Comprehensive Fauna Hook managing:
 * 1. Bunny rotating across available trees every 14-second peek cycle.
 * 2. Ground Fauna (Chicken, Duck, Sheep, Goat) rotating through species so only 1 ground animal
 *    wanders at a time, strictly avoiding on-screen clutter.
 * 3. Butterfly flying from flower patch to flower patch, landing still, then meandering again.
 */
export function useFaunaManager(
  grid: TileType[][],
  marks: boolean[][],
  levelId: number
): FaunaManagerResult {
  const size = grid.length;

  // 1. Gather all tree coordinates
  const trees: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 'tree') {
        trees.push({ r, c });
      }
    }
  }

  // Active tree index rotates every 14s (the exact duration of bunnyPhysicalPeek)
  const [activeTreeIdx, setActiveTreeIdx] = useState(0);

  useEffect(() => {
    if (trees.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTreeIdx((prev) => (prev + 1) % trees.length);
    }, 14000);
    return () => clearInterval(interval);
  }, [trees.length]);

  const rawBunnyTree = trees.length > 0 ? trees[activeTreeIdx % trees.length] : null;
  const bunnyTree = rawBunnyTree
    ? {
        ...rawBunnyTree,
        peekDir: rawBunnyTree.c === 0 ? ('right' as const) : ('left' as const)
      }
    : null;

  // 2. Gather all marked grass cells & flower cells
  const markedGrass: Array<{ r: number; c: number }> = [];
  const flowerCells: Array<{ r: number; c: number }> = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 'empty' && marks[r]?.[c]) {
        markedGrass.push({ r, c });
        if (getTileFlora(levelId, r, c) !== null) {
          flowerCells.push({ r, c });
        }
      }
    }
  }

  // 3. Ground Fauna Species Rotation (Cycles every 26s across Chicken -> Duck -> Sheep -> Goat)
  const [speciesIdx, setSpeciesIdx] = useState(
    () => Math.abs(levelId * 3) % GROUND_SPECIES_ROSTER.length
  );

  useEffect(() => {
    const rotInterval = setInterval(() => {
      setSpeciesIdx((prev) => (prev + 1) % GROUND_SPECIES_ROSTER.length);
    }, 26000);
    return () => clearInterval(rotInterval);
  }, []);

  const currentSpecies = GROUND_SPECIES_ROSTER[speciesIdx % GROUND_SPECIES_ROSTER.length];

  // Wandering Ground Fauna State (Only 1 ground animal on screen at a time)
  const [groundFauna, setGroundFauna] = useState<GroundFaunaTileState | null>(null);

  useEffect(() => {
    if (markedGrass.length === 0) {
      setGroundFauna(null);
      return;
    }

    setGroundFauna((prev) => {
      if (prev && markedGrass.some((g) => g.r === prev.r && g.c === prev.c)) {
        return { ...prev, species: currentSpecies };
      }
      const initial = markedGrass[(levelId * 5) % markedGrass.length];
      return {
        species: currentSpecies,
        r: initial.r,
        c: initial.c,
        isWalking: false,
        facingLeft: false
      };
    });

    const wanderInterval = setInterval(() => {
      setGroundFauna((curr) => {
        if (!curr) return null;
        // Find adjacent marked grass cells
        const neighbors = [
          { r: curr.r - 1, c: curr.c, dx: 0, dy: 1 },
          { r: curr.r + 1, c: curr.c, dx: 0, dy: -1 },
          { r: curr.r, c: curr.c - 1, dx: 1, dy: 0 },
          { r: curr.r, c: curr.c + 1, dx: -1, dy: 0 }
        ].filter((n) => markedGrass.some((g) => g.r === n.r && g.c === n.c));

        if (neighbors.length > 0) {
          const next = neighbors[Math.floor(Math.random() * neighbors.length)];
          const facingLeft = next.c < curr.c ? true : next.c > curr.c ? false : curr.facingLeft;
          return {
            species: currentSpecies,
            r: next.r,
            c: next.c,
            isWalking: true,
            facingLeft,
            fromDelta: { dx: curr.c - next.c, dy: curr.r - next.r }
          };
        } else {
          // Single cell: turn around and stand/peck in place
          return {
            ...curr,
            species: currentSpecies,
            isWalking: false,
            facingLeft: !curr.facingLeft,
            fromDelta: undefined
          };
        }
      });

      // Stop walking after walk animation (1.5s)
      setTimeout(() => {
        setGroundFauna((curr) => (curr ? { ...curr, isWalking: false } : null));
      }, 1500);
    }, 5800);

    return () => clearInterval(wanderInterval);
  }, [markedGrass.length, levelId, currentSpecies]);

  // 4. Flying Butterfly State
  const [butterfly, setButterfly] = useState<ButterflyTileState | null>(null);
  const destinations = flowerCells.length > 0 ? flowerCells : markedGrass;

  useEffect(() => {
    if (destinations.length === 0) {
      setButterfly(null);
      return;
    }

    setButterfly((prev) => {
      if (prev && destinations.some((g) => g.r === prev.r && g.c === prev.c)) {
        return prev;
      }
      const initial = destinations[(levelId * 11) % destinations.length];
      return { r: initial.r, c: initial.c, isFlying: false };
    });

    const flyInterval = setInterval(() => {
      setButterfly((curr) => {
        if (!curr || destinations.length <= 1) return curr;
        const others = destinations.filter((d) => !(d.r === curr.r && d.c === curr.c));
        const next = others[Math.floor(Math.random() * others.length)];
        return {
          r: next.r,
          c: next.c,
          isFlying: true,
          fromDelta: { dx: curr.c - next.c, dy: curr.r - next.r }
        };
      });

      // After flight animation completes (2.5s), land and stay completely still on flower
      setTimeout(() => {
        setButterfly((curr) => (curr ? { ...curr, isFlying: false } : null));
      }, 2500);
    }, 8500); // 2.5s flight + 6.0s resting still on flower

    return () => clearInterval(flyInterval);
  }, [destinations.length, levelId]);

  return {
    bunnyTree,
    groundFauna,
    chicken: groundFauna,
    butterfly
  };
}

export const FloraGraphic: React.FC<{ type: FloraType; seed?: number }> = ({ type, seed = 0 }) => {
  const src = FLORA_MAP[type];
  const delay = (seed % 5) * 0.7;

  return (
    <img
      src={src}
      alt={type}
      className="tile-flora-img"
      style={{ animationDelay: `${delay}s` }}
      draggable={false}
    />
  );
};

export const PeekingBunnyGraphic: React.FC<{ peekDir?: 'left' | 'right' }> = ({
  peekDir = 'left'
}) => {
  return (
    <img
      src={bunnyImg}
      alt="Bunny"
      className={`tree-peeking-bunny peek-${peekDir}`}
      draggable={false}
    />
  );
};

const GROUND_FAUNA_IMG: Record<GroundFaunaSpecies, string> = {
  chicken: chickenImg,
  duck: duckImg,
  goat: goatImg,
  sheep: sheepImg
};

export const GroundFaunaGraphic: React.FC<{
  species: GroundFaunaSpecies;
  isWalking: boolean;
  facingLeft: boolean;
  fromDelta?: { dx: number; dy: number };
}> = ({ species, isWalking, facingLeft, fromDelta }) => {
  const isPecker = species === 'chicken' || species === 'duck';
  const animClass = isWalking ? 'is-walking' : isPecker ? 'is-pecking' : 'is-standing';
  const dx = fromDelta?.dx ?? 0;
  const dy = fromDelta?.dy ?? 0;

  // Crucial: Set the initial transform so the element mounts at its prior location and never jumps
  const initialTransform = isWalking && fromDelta
    ? `translate(calc(${dx} * var(--tile-size)), calc(${dy} * var(--tile-size))) scaleX(${facingLeft ? -1 : 1})`
    : `translate(0, 0) scaleX(${facingLeft ? -1 : 1})`;

  return (
    <div
      key={`${species}-${dx}-${dy}-${isWalking}`}
      className={`tile-fauna-actor fauna-${species} ${animClass}`}
      style={
        {
          '--walk-dx': dx,
          '--walk-dy': dy,
          '--facing-scale': facingLeft ? -1 : 1,
          transform: initialTransform
        } as React.CSSProperties
      }
    >
      <img
        src={GROUND_FAUNA_IMG[species]}
        alt={species}
        className={`tile-fauna-img fauna-img-${species}`}
        draggable={false}
      />
    </div>
  );
};

// Backward compatibility helper
export const ChickenGraphic: React.FC<{
  isWalking: boolean;
  facingLeft: boolean;
  fromDelta?: { dx: number; dy: number };
}> = (props) => <GroundFaunaGraphic species="chicken" {...props} />;

export const ButterflyGraphic: React.FC<{
  isFlying: boolean;
  fromDelta?: { dx: number; dy: number };
}> = ({ isFlying, fromDelta }) => {
  const stateClass = isFlying ? 'is-flying' : 'is-landed';
  const dx = fromDelta?.dx ?? 0;
  const dy = fromDelta?.dy ?? 0;

  // Crucial: Set initial transform to prevent flight teleportation
  const initialTransform = isFlying && fromDelta
    ? `translate(calc(${dx} * var(--tile-size)), calc(${dy} * var(--tile-size)))`
    : 'translate(0, 0)';

  return (
    <div
      key={`butterfly-${dx}-${dy}-${isFlying}`}
      className={`tile-butterfly-actor ${stateClass}`}
      style={
        {
          '--fly-dx': dx,
          '--fly-dy': dy,
          transform: initialTransform
        } as React.CSSProperties
      }
    >
      <img src={butterflyImg} alt="Butterfly" className="tile-butterfly-img" draggable={false} />
    </div>
  );
};
