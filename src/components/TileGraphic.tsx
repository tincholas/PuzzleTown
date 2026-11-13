import React from 'react';
import { BuildingType, PlaceableType, TileType } from '../engine/types';
import {
  ButterflyGraphic,
  ButterflyTileState,
  ChickenGraphic,
  ChickenTileState,
  FloraGraphic,
  FloraType,
  GroundFaunaGraphic,
  GroundFaunaSpecies,
  GroundFaunaTileState,
  PeekingBunnyGraphic,
  PeekingRockAnimalGraphic
} from './Decorations';

import farmStage1 from '../assets/buildings/farm_stage1.png';
import farmStage2 from '../assets/buildings/farm_stage2.png';
import farmStage3 from '../assets/buildings/farm_stage3.png';

import houseStage1 from '../assets/buildings/house_stage1.png';
import houseStage2 from '../assets/buildings/house_stage2.png';
import houseStage3 from '../assets/buildings/house_stage3.png';

import woodcutterStage1 from '../assets/buildings/woodcutter_stage1.png';
import woodcutterStage2 from '../assets/buildings/woodcutter_stage2.png';
import woodcutterStage3 from '../assets/buildings/woodcutter_stage3.png';

import townHallStage1 from '../assets/buildings/town_hall_stage1.png';
import townHallStage2 from '../assets/buildings/town_hall_stage2.png';
import townHallStage3 from '../assets/buildings/town_hall_stage3.png';

import treeImg from '../assets/obstacles/tree.png';
import rockImg from '../assets/obstacles/rock.png';
import tileBgImg from '../assets/tile_bg.png';
import earthBg1 from '../assets/earth_bg1.png';
import earthBg2 from '../assets/earth_bg2.png';
import earthBg3 from '../assets/earth_bg3.png';
import emptyBg1 from '../assets/empty_bg1.png';
import emptyBg2 from '../assets/empty_bg2.png';
import emptyBg3 from '../assets/empty_bg3.png';
import buildingImg from '../assets/building.png';

export interface RoadConnections {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const BUILDING_STAGE_ASSETS: Record<
  BuildingType,
  { stage1: string; stage2: string; stage3: string }
> = {
  farm: { stage1: farmStage1, stage2: farmStage2, stage3: farmStage3 },
  house: { stage1: houseStage1, stage2: houseStage2, stage3: houseStage3 },
  woodcutter: { stage1: woodcutterStage1, stage2: woodcutterStage2, stage3: woodcutterStage3 },
  town_hall: { stage1: townHallStage1, stage2: townHallStage2, stage3: townHallStage3 }
};

// Preload building & obstacle images for instant zero-lag animations
if (typeof window !== 'undefined') {
  Object.values(BUILDING_STAGE_ASSETS).forEach((layers) => {
    [layers.stage1, layers.stage2, layers.stage3].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  });
  [treeImg, rockImg, tileBgImg, earthBg1, earthBg2, earthBg3, emptyBg1, emptyBg2, emptyBg3, buildingImg].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export const TreeGraphic: React.FC<{
  hasBunny?: boolean;
  bunnyPeekDir?: 'left' | 'right';
}> = ({ hasBunny = false, bunnyPeekDir = 'left' }) => (
  <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="tile-ground-shadow obstacle-tree-shadow" />
    {hasBunny && <PeekingBunnyGraphic peekDir={bunnyPeekDir} />}
    <img
      src={treeImg}
      alt="Tree"
      className="tile-obstacle-img"
      style={{ position: 'relative', zIndex: 1 }}
      draggable={false}
    />
  </div>
);

export const BuildingGraphic: React.FC<{ isNewlyBuilt?: boolean }> = ({
  isNewlyBuilt = false
}) => (
  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="tile-ground-shadow building-shadow" />
    <img
      src={buildingImg}
      alt="Building"
      className={`tile-building-img ${isNewlyBuilt ? 'is-animating-build' : ''}`}
      draggable={false}
    />
    {isNewlyBuilt && (
      <div className="construction-dust-emitter" aria-hidden="true">
        <div className="dust-puff dust-puff-1" />
        <div className="dust-puff dust-puff-2" />
        <div className="dust-puff dust-puff-3" />
        <div className="dust-puff dust-puff-4" />
        <div className="dust-puff dust-puff-5" />
        <div className="dust-puff dust-puff-6" />
      </div>
    )}
  </div>
);

export const RockGraphic: React.FC<{
  peekingAnimal?: GroundFaunaSpecies | null;
  peekDir?: 'left' | 'right';
}> = ({ peekingAnimal = null, peekDir = 'left' }) => (
  <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="tile-ground-shadow obstacle-rock-shadow" />
    {peekingAnimal && (
      <PeekingRockAnimalGraphic species={peekingAnimal} peekDir={peekDir} />
    )}
    <img
      src={rockImg}
      alt="Rock"
      className="tile-obstacle-img"
      style={{ position: 'relative', zIndex: 1 }}
      draggable={false}
    />
  </div>
);

export interface BuildingSpriteProps {
  type: BuildingType;
  isNewlyBuilt?: boolean;
}

const CHIMNEY_COORDS: Partial<Record<BuildingType, { x: string; y: string }>> = {
  house: { x: '76%', y: '21%' },
  town_hall: { x: '76.67%', y: '15%' },
  woodcutter: { x: '65.67%', y: '12.67%' }
};

export interface BuildingSpriteProps {
  type: BuildingType;
  isNewlyBuilt?: boolean;
  disableSmoke?: boolean;
}

export const BuildingSprite: React.FC<BuildingSpriteProps> = ({
  type,
  isNewlyBuilt = false,
  disableSmoke = false
}) => {
  const assets = BUILDING_STAGE_ASSETS[type];
  if (!assets) return null;

  const chimney = CHIMNEY_COORDS[type];

  return (
    <div
      className={`building-sprite-container ${isNewlyBuilt ? 'is-animating-build' : ''}`}
      aria-label={type}
    >
      <div className={`tile-ground-shadow building-${type}-shadow`} />
      <img
        src={assets.stage1}
        alt=""
        className="building-layer building-layer-1"
        draggable={false}
      />
      <img
        src={assets.stage2}
        alt=""
        className="building-layer building-layer-2"
        draggable={false}
      />
      <img
        src={assets.stage3}
        alt=""
        className="building-layer building-layer-3"
        draggable={false}
      />
      {isNewlyBuilt && (
        <div className="construction-dust-emitter" aria-hidden="true">
          <div className="dust-puff dust-puff-1" />
          <div className="dust-puff dust-puff-2" />
          <div className="dust-puff dust-puff-3" />
          <div className="dust-puff dust-puff-4" />
          <div className="dust-puff dust-puff-5" />
          <div className="dust-puff dust-puff-6" />
        </div>
      )}
      {!disableSmoke && chimney && (
        <div
          className="chimney-smoke-emitter"
          style={{ left: chimney.x, top: chimney.y }}
          aria-hidden="true"
        >
          <div className="smoke-puff smoke-puff-1" />
          <div className="smoke-puff smoke-puff-2" />
          <div className="smoke-puff smoke-puff-3" />
          <div className="smoke-puff smoke-puff-4" />
          <div className="smoke-puff smoke-puff-5" />
          <div className="smoke-puff smoke-puff-6" />
        </div>
      )}
    </div>
  );
};

interface TileGraphicProps {
  type: TileType;
  markedEmpty?: boolean;
  markedBuilding?: boolean;
  ruledOutForActiveType?: PlaceableType | null;
  excludedCount?: number;
  excludedTypes?: Set<PlaceableType>;
  roadConnections?: RoadConnections;
  variantSeed?: number;
  isNewlyBuilt?: boolean;
  hasBunny?: boolean;
  bunnyPeekDir?: 'left' | 'right';
  peekingRockAnimal?: GroundFaunaSpecies | null;
  rockPeekDir?: 'left' | 'right';
  floraType?: FloraType | null;
  groundFaunaState?: GroundFaunaTileState | null;
  chickenState?: GroundFaunaTileState | null;
  butterflyState?: ButterflyTileState | null;
  disableSmoke?: boolean;
}

export const TileGraphic: React.FC<TileGraphicProps> = ({
  type,
  markedEmpty = false,
  markedBuilding = false,
  ruledOutForActiveType = null,
  excludedCount = 0,
  excludedTypes,
  roadConnections,
  variantSeed = 0,
  isNewlyBuilt = false,
  hasBunny = false,
  bunnyPeekDir = 'left',
  peekingRockAnimal = null,
  rockPeekDir = 'left',
  floraType = null,
  groundFaunaState = null,
  chickenState = null,
  butterflyState = null,
  disableSmoke = false
}) => {
  switch (type) {
    case 'tree':
      return <TreeGraphic hasBunny={hasBunny} bunnyPeekDir={bunnyPeekDir} />;
    case 'rock':
      return <RockGraphic peekingAnimal={peekingRockAnimal} peekDir={rockPeekDir} />;
    case 'house':
    case 'woodcutter':
    case 'farm':
    case 'town_hall': {
      const hasRoadConns =
        (type === 'woodcutter' || type === 'farm' || type === 'town_hall') &&
        roadConnections &&
        (roadConnections.up ||
          roadConnections.down ||
          roadConnections.left ||
          roadConnections.right);

      if (!hasRoadConns) {
        return (
          <BuildingSprite
            type={type}
            isNewlyBuilt={isNewlyBuilt}
            disableSmoke={disableSmoke}
          />
        );
      }

      return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <RoadSvg
              connections={roadConnections}
              variantSeed={variantSeed}
              isBuildingUnderlay
            />
          </div>
          <BuildingSprite
            type={type}
            isNewlyBuilt={isNewlyBuilt}
            disableSmoke={disableSmoke}
          />
        </div>
      );
    }
    case 'road':
      return <RoadSvg connections={roadConnections} variantSeed={variantSeed} />;
    case 'empty':
    default:
      if (markedBuilding) {
        return <BuildingGraphic isNewlyBuilt={isNewlyBuilt} />;
      }
      if (markedEmpty) {
        const activeFauna = groundFaunaState ?? chickenState;
        return (
          <>
            {floraType && <FloraGraphic type={floraType} seed={variantSeed} />}
            {activeFauna && (
              <GroundFaunaGraphic
                species={activeFauna.species}
                isWalking={activeFauna.isWalking}
                facingLeft={activeFauna.facingLeft}
                fromDelta={activeFauna.fromDelta}
              />
            )}
            {butterflyState && (
              <ButterflyGraphic
                isFlying={butterflyState.isFlying}
                fromDelta={butterflyState.fromDelta}
              />
            )}
          </>
        );
      }
      if (ruledOutForActiveType) {
        return <RuledOutBuildingSvg excludedType={ruledOutForActiveType} />;
      }
      return null;
  }
};

/**
 * Contextual "Cannot be [Active Building]" overlay shown only when that building is selected in the tray.
 */
export const RuledOutBuildingSvg: React.FC<{
  excludedType: PlaceableType;
}> = ({ excludedType }) => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    {/* Ghosted miniature silhouette of the ruled-out building */}
    <g opacity="0.32" transform="translate(15, 15) scale(0.7)">
      {excludedType === 'house' && <HouseSvg />}
      {excludedType === 'woodcutter' && <WoodcutterSvg />}
      {excludedType === 'farm' && <FarmSvg />}
      {excludedType === 'town_hall' && <TownHallSvg />}
      {excludedType === 'road' && <RoadSvg />}
    </g>
    {/* Crisp wooden/red X slash */}
    <g>
      <circle
        cx="50"
        cy="50"
        r="26"
        fill="rgba(224, 79, 68, 0.16)"
        stroke="#c93b2b"
        strokeWidth="5"
      />
      <line
        x1="32"
        y1="32"
        x2="68"
        y2="68"
        stroke="#c93b2b"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

/**
 * Player's deduction marker ("X" / pebbles & grass tuft, matching the mockup's marked empty cells)
 */
export const MarkedGrassSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    {/* Small stones */}
    <path
      d="M24,68 C22,60 30,55 37,59 C42,62 41,70 35,72 Z"
      fill="#9e9589"
      stroke="#2b1e16"
      strokeWidth="3.5"
    />
    <path
      d="M62,36 C60,30 67,27 72,30 C76,33 74,39 68,40 Z"
      fill="#b5aba0"
      stroke="#2b1e16"
      strokeWidth="3"
    />
    {/* Lush grass tuft + tiny pink flower */}
    <path
      d="M46,62 L40,44 L49,54 L53,39 L57,54 L66,45 L59,62 Z"
      fill="#6ca83c"
      stroke="#2b1e16"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <circle
      cx="36"
      cy="38"
      r="5.5"
      fill="#f0788c"
      stroke="#2b1e16"
      strokeWidth="2.8"
    />
    <circle cx="36" cy="38" r="2" fill="#ffd966" />
  </svg>
);

/**
 * Generic Building Foundation / Construction Site marker.
 * Used when a square is deduced to MUST contain a building, before its specific type is known.
 */
export const BuildingFoundationSvg: React.FC<{
  isNewlyBuilt?: boolean;
}> = ({ isNewlyBuilt = false }) => (
  <svg
    viewBox="0 0 100 100"
    className={`tile-svg building-foundation-svg ${isNewlyBuilt ? 'is-animating-build' : ''}`}
    aria-label="Building Foundation"
  >
    {/* Ground clearance drop shadow */}
    <rect
      x="16"
      y="18"
      width="68"
      height="68"
      rx="6"
      fill="rgba(43, 30, 22, 0.28)"
    />

    {/* Packed earth / gravel building footprint base */}
    <rect
      x="18"
      y="18"
      width="64"
      height="64"
      rx="5"
      fill="#a07c50"
      stroke="#2b1e16"
      strokeWidth="3.2"
    />

    {/* Cross-hatch construction layout blueprint lines */}
    <g opacity="0.35" stroke="#f6e4bc" strokeWidth="1.8" strokeDasharray="3 3">
      <line x1="18" y1="50" x2="82" y2="50" />
      <line x1="50" y1="18" x2="50" y2="82" />
      <line x1="26" y1="26" x2="74" y2="74" />
      <line x1="74" y1="26" x2="26" y2="74" />
    </g>

    {/* Outer Timber Foundation Sill Beams */}
    {/* Top Beam */}
    <rect
      x="20"
      y="22"
      width="60"
      height="8"
      rx="2"
      fill="#8c5832"
      stroke="#2b1e16"
      strokeWidth="3"
    />
    {/* Bottom Beam */}
    <rect
      x="20"
      y="70"
      width="60"
      height="8"
      rx="2"
      fill="#6e4226"
      stroke="#2b1e16"
      strokeWidth="3"
    />
    {/* Left Beam */}
    <rect
      x="22"
      y="22"
      width="8"
      height="56"
      rx="2"
      fill="#7a4b29"
      stroke="#2b1e16"
      strokeWidth="3"
    />
    {/* Right Beam */}
    <rect
      x="70"
      y="22"
      width="8"
      height="56"
      rx="2"
      fill="#7a4b29"
      stroke="#2b1e16"
      strokeWidth="3"
    />

    {/* 4 Corner Foundation Posts with peg accents */}
    {[
      { x: 18, y: 18 },
      { x: 68, y: 18 },
      { x: 18, y: 68 },
      { x: 68, y: 68 }
    ].map((post, idx) => (
      <g key={idx}>
        <rect
          x={post.x}
          y={post.y}
          width="14"
          height="14"
          rx="3"
          fill="#5c3419"
          stroke="#2b1e16"
          strokeWidth="3.2"
        />
        <circle cx={post.x + 7} cy={post.y + 7} r="2.5" fill="#ffd966" />
      </g>
    ))}

    {/* Center Construction Badge / Building Silhouette */}
    <circle
      cx="50"
      cy="50"
      r="16"
      fill="#d97706"
      stroke="#2b1e16"
      strokeWidth="3"
    />
    {/* Iconic Generic Building Gable & Pillars silhouette inside badge */}
    <g fill="#fef3c7" stroke="#2b1e16" strokeWidth="1.6" strokeLinejoin="round">
      {/* Roof */}
      <polygon points="41,45 50,38 59,45" />
      {/* 3 Pillars */}
      <rect x="42.5" y="46" width="2.5" height="9" rx="0.5" />
      <rect x="48.7" y="46" width="2.5" height="9" rx="0.5" />
      <rect x="55" y="46" width="2.5" height="9" rx="0.5" />
      {/* Floor */}
      <rect x="40" y="55" width="20" height="2.5" rx="0.8" />
    </g>
  </svg>
);

export const TreeSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    {/* Ground shadow */}
    <ellipse cx="52" cy="82" rx="26" ry="9" fill="#4f7c28" />
    {/* Trunk & roots */}
    <path
      d="M42,83 L45,58 L55,58 L58,83 L63,86 L54,84 L50,88 L46,84 L37,86 Z"
      fill="#6e4226"
      stroke="#2b1e16"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    {/* Canopy back/shadow */}
    <circle
      cx="34"
      cy="48"
      r="19"
      fill="#528c2c"
      stroke="#2b1e16"
      strokeWidth="4"
    />
    <circle
      cx="66"
      cy="48"
      r="19"
      fill="#528c2c"
      stroke="#2b1e16"
      strokeWidth="4"
    />
    <circle
      cx="50"
      cy="52"
      r="22"
      fill="#62a135"
      stroke="#2b1e16"
      strokeWidth="4"
    />
    {/* Canopy top */}
    <circle
      cx="50"
      cy="33"
      r="22"
      fill="#7ec247"
      stroke="#2b1e16"
      strokeWidth="4"
    />
    {/* Highlights */}
    <path
      d="M37,25 A14,14 0 0,1 58,21"
      fill="none"
      stroke="#a8e070"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

export const RockSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    <ellipse cx="50" cy="78" rx="34" ry="10" fill="#a88652" />
    {/* Main boulder */}
    <path
      d="M20,74 L26,42 L46,26 L72,34 L82,60 L76,76 Z"
      fill="#8c857B"
      stroke="#2b1e16"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    {/* Highlight facets */}
    <path d="M28,44 L46,30 L68,37 L54,54 Z" fill="#aba49a" />
    {/* Secondary front rock */}
    <path
      d="M44,78 L52,54 L72,52 L84,72 L76,80 Z"
      fill="#736c63"
      stroke="#2b1e16"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    {/* Moss patch */}
    <path
      d="M34,75 C36,67 45,67 48,75"
      fill="#6ca83c"
      stroke="#2b1e16"
      strokeWidth="3"
    />
  </svg>
);

export const HouseSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    <ellipse cx="50" cy="84" rx="34" ry="8" fill="#b38e56" />
    {/* Chimney */}
    <rect
      x="62"
      y="18"
      width="11"
      height="24"
      rx="2"
      fill="#a13d2d"
      stroke="#2b1e16"
      strokeWidth="3.8"
    />
    {/* House walls */}
    <rect
      x="24"
      y="46"
      width="52"
      height="36"
      rx="3"
      fill="#f3DEC0"
      stroke="#2b1e16"
      strokeWidth="4"
    />
    {/* Side wall shading */}
    <rect x="24" y="46" width="12" height="36" fill="#dfC59e" />
    {/* Roof */}
    <polygon
      points="16,50 50,16 84,50"
      fill="#cf4d38"
      stroke="#2b1e16"
      strokeWidth="4.2"
      strokeLinejoin="round"
    />
    {/* Roof shingle lines */}
    <line
      x1="31"
      y1="36"
      x2="69"
      y2="36"
      stroke="#9e3322"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="24"
      y1="43"
      x2="76"
      y2="43"
      stroke="#9e3322"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* Door */}
    <rect
      x="43"
      y="58"
      width="14"
      height="24"
      rx="2"
      fill="#7d4a28"
      stroke="#2b1e16"
      strokeWidth="3.5"
    />
    {/* Windows */}
    <rect
      x="29"
      y="56"
      width="9"
      height="10"
      rx="1.5"
      fill="#84c9e0"
      stroke="#2b1e16"
      strokeWidth="3"
    />
    <rect
      x="62"
      y="56"
      width="9"
      height="10"
      rx="1.5"
      fill="#84c9e0"
      stroke="#2b1e16"
      strokeWidth="3"
    />
    {/* Attic window */}
    <circle
      cx="50"
      cy="36"
      r="5"
      fill="#ffdf78"
      stroke="#2b1e16"
      strokeWidth="3"
    />
  </svg>
);

export const WoodcutterSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    <ellipse cx="50" cy="84" rx="35" ry="8" fill="#b38e56" />
    {/* Log Cabin Body */}
    <rect
      x="22"
      y="45"
      width="56"
      height="37"
      rx="3"
      fill="#7b4b28"
      stroke="#2b1e16"
      strokeWidth="4"
    />
    {/* Horizontal log lines */}
    <line x1="22" y1="54" x2="78" y2="54" stroke="#2b1e16" strokeWidth="3" />
    <line x1="22" y1="63" x2="78" y2="63" stroke="#2b1e16" strokeWidth="3" />
    <line x1="22" y1="72" x2="78" y2="72" stroke="#2b1e16" strokeWidth="3" />
    {/* Notched log ends on left & right */}
    {[49, 58, 67, 76].map((y) => (
      <React.Fragment key={y}>
        <circle
          cx="22"
          cy={y}
          r="4"
          fill="#b88456"
          stroke="#2b1e16"
          strokeWidth="2.8"
        />
        <circle
          cx="78"
          cy={y}
          r="4"
          fill="#b88456"
          stroke="#2b1e16"
          strokeWidth="2.8"
        />
      </React.Fragment>
    ))}
    {/* Wooden Gabled Roof */}
    <polygon
      points="15,48 50,18 85,48"
      fill="#5c361c"
      stroke="#2b1e16"
      strokeWidth="4.2"
      strokeLinejoin="round"
    />
    <polygon
      points="23,46 50,23 77,46"
      fill="#8c5832"
      stroke="#2b1e16"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Door */}
    <rect
      x="43"
      y="58"
      width="14"
      height="24"
      rx="2"
      fill="#472813"
      stroke="#2b1e16"
      strokeWidth="3.5"
    />
  </svg>
);

export const FarmSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    {/* Tilled soil base */}
    <rect
      x="16"
      y="20"
      width="68"
      height="62"
      rx="6"
      fill="#b58347"
      stroke="#2b1e16"
      strokeWidth="3.5"
    />
    {/* Golden & green crop rows */}
    {[28, 41, 54, 67].map((x) => (
      <g key={x}>
        <line
          x1={x}
          y1="25"
          x2={x}
          y2="76"
          stroke="#6e4720"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {[28, 38, 48, 58, 68, 75].map((y) => (
          <circle
            key={y}
            cx={x}
            cy={y}
            r="3.6"
            fill="#7bc043"
            stroke="#2b1e16"
            strokeWidth="2"
          />
        ))}
      </g>
    ))}
    {/* Small rustic farm shed on left */}
    <rect
      x="14"
      y="38"
      width="24"
      height="32"
      rx="2"
      fill="#8c552e"
      stroke="#2b1e16"
      strokeWidth="3.5"
    />
    <polygon
      points="11,40 26,24 41,40"
      fill="#6b3e1e"
      stroke="#2b1e16"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const TownHallSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    <ellipse cx="50" cy="85" rx="38" ry="8" fill="#b38e56" />
    {/* Perimeter low wooden fence posts */}
    <rect
      x="12"
      y="68"
      width="76"
      height="16"
      rx="2"
      fill="none"
      stroke="#6e4226"
      strokeWidth="3.5"
    />
    {/* Grand Manor / Barn Hall Body */}
    <rect
      x="22"
      y="40"
      width="56"
      height="40"
      rx="3"
      fill="#d96b43"
      stroke="#2b1e16"
      strokeWidth="4"
    />
    {/* Gambrel / Dutch Barn Roof */}
    <polygon
      points="15,44 28,22 50,14 72,22 85,44"
      fill="#9e3525"
      stroke="#2b1e16"
      strokeWidth="4.2"
      strokeLinejoin="round"
    />
    {/* White trim / clock gable */}
    <polygon
      points="34,42 50,24 66,42"
      fill="#f5e6cc"
      stroke="#2b1e16"
      strokeWidth="3.2"
      strokeLinejoin="round"
    />
    <circle
      cx="50"
      cy="35"
      r="4.5"
      fill="#ffd966"
      stroke="#2b1e16"
      strokeWidth="2.5"
    />
    {/* Grand Double Doors */}
    <rect
      x="39"
      y="54"
      width="22"
      height="26"
      rx="2"
      fill="#5c3419"
      stroke="#2b1e16"
      strokeWidth="3.5"
    />
    <line x1="50" y1="54" x2="50" y2="80" stroke="#2b1e16" strokeWidth="2.8" />
    {/* Corner fence posts */}
    {[12, 30, 70, 84].map((x) => (
      <rect
        key={x}
        x={x}
        y="64"
        width="5"
        height="22"
        rx="1"
        fill="#8c5832"
        stroke="#2b1e16"
        strokeWidth="2.5"
      />
    ))}
  </svg>
);

/**
 * Configurable Road Styling Parameters
 * Easily tweakable values for waviness, stroke widths, roughness, and pebbles.
 */
export const ROAD_CONFIG = {
  // Centerline meander wave amplitude on straight/dead-end paths (in SVG units)
  meanderAmplitude: 12.0,
  // Layer stroke widths
  vergeWidth: 52, // Soft grass-to-dirt outer blend
  borderWidth: 44, // Rich dark earthy brown road shoulder
  earthWidth: 34, // Main masked earth PNG road width
  centerTrackWidth: 14, // Lighter center worn vehicle track
  // SVG edge displacement (higher = more organic/wavy road borders)
  roughnessScale: 4.2, // Filter displacement amplitude
  roughnessFreq: 0.075, // Noise frequency (0.075 gives broad natural dirt-road waves)
  // Pebble scale multiplier (makes pebbles slightly larger and chunkier)
  pebbleScale: 1.35
};

export interface PebbleData {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  isSpeck?: boolean;
}

/**
 * Generates natural, varied shoulder pebbles based on tile topology and seed.
 * Features multi-stone clusters, staggered placements, and occasional clean stretches.
 */
export function generatePebblesForTile(
  connections: RoadConnections | undefined,
  variantSeed: number,
  scale: number = ROAD_CONFIG.pebbleScale
): PebbleData[] {
  const up = connections?.up ?? false;
  const down = connections?.down ?? false;
  const left = connections?.left ?? false;
  const right = connections?.right ?? false;
  const connCount =
    (up ? 1 : 0) + (down ? 1 : 0) + (left ? 1 : 0) + (right ? 1 : 0);

  const pebbles: PebbleData[] = [];
  const pSeed = (variantSeed * 17 + 11) % 100;

  const addStoneCluster = (
    cx: number,
    cy: number,
    baseRot: number,
    count: number = 2
  ) => {
    // Primary main stone
    pebbles.push({
      cx,
      cy,
      rx: 4.6 * scale,
      ry: 3.3 * scale,
      rot: baseRot + (pSeed % 18) - 9
    });
    // Secondary companion pebble
    if (count >= 2) {
      const angle = (baseRot + 50) * (Math.PI / 180);
      pebbles.push({
        cx: cx + 5.6 * scale * Math.cos(angle),
        cy: cy + 5.6 * scale * Math.sin(angle),
        rx: 3.0 * scale,
        ry: 2.2 * scale,
        rot: baseRot - 32
      });
    }
    // Tiny crumb / dirt speck
    if (count >= 3) {
      pebbles.push({
        cx: cx - 4.2 * scale,
        cy: cy + 3.2 * scale,
        rx: 1.5 * scale,
        ry: 1.3 * scale,
        rot: 12,
        isSpeck: true
      });
    }
  };

  if (connCount === 0) {
    // Isolated road / tray preview
    addStoneCluster(22, 24, -15, 2);
    addStoneCluster(78, 76, 25, 3);
  } else if (connCount === 1) {
    // Dead-end: variety around the turnaround
    const mode = pSeed % 3;
    if (mode === 0) {
      if (up) addStoneCluster(24, 62, 15, 2);
      else if (down) addStoneCluster(76, 38, -20, 2);
      else if (left) addStoneCluster(62, 24, 25, 2);
      else if (right) addStoneCluster(38, 76, -15, 2);
    } else if (mode === 1) {
      if (up) addStoneCluster(76, 62, -25, 3);
      else if (down) addStoneCluster(24, 38, 20, 3);
      else if (left) addStoneCluster(62, 76, -15, 3);
      else if (right) addStoneCluster(38, 24, 20, 3);
    }
  } else if (connCount === 2 && up && down) {
    // Straight vertical: 5 diverse patterns (left cluster, right cluster, staggered duo, single, or clean)
    const mode = pSeed % 5;
    if (mode === 0) addStoneCluster(16, 34, -20, 2);
    else if (mode === 1) addStoneCluster(84, 66, 25, 3);
    else if (mode === 2) {
      addStoneCluster(16, 25, -15, 1);
      addStoneCluster(84, 75, 30, 2);
    } else if (mode === 3) addStoneCluster(84, 42, -10, 2);
    // mode 4: clean grass
  } else if (connCount === 2 && left && right) {
    // Straight horizontal: 5 diverse patterns (top, bottom, staggered, single, or clean)
    const mode = pSeed % 5;
    if (mode === 0) addStoneCluster(66, 16, 15, 2);
    else if (mode === 1) addStoneCluster(34, 84, -25, 3);
    else if (mode === 2) {
      addStoneCluster(26, 16, 20, 2);
      addStoneCluster(74, 84, -15, 1);
    } else if (mode === 3) addStoneCluster(46, 16, -30, 2);
    // mode 4: clean grass
  } else if (connCount === 2) {
    // 90-degree Turn: place in the wide outer corner or tight inner bend
    const mode = pSeed % 4;
    let outerX = 22;
    let outerY = 78;
    let innerX = 78;
    let innerY = 22;
    if (up && right) {
      outerX = 22;
      outerY = 78;
      innerX = 80;
      innerY = 20;
    } else if (up && left) {
      outerX = 78;
      outerY = 78;
      innerX = 20;
      innerY = 20;
    } else if (down && right) {
      outerX = 22;
      outerY = 22;
      innerX = 80;
      innerY = 80;
    } else if (down && left) {
      outerX = 78;
      outerY = 22;
      innerX = 20;
      innerY = 80;
    }

    if (mode === 0) addStoneCluster(outerX, outerY, -25, 3);
    else if (mode === 1) addStoneCluster(outerX, outerY, 35, 2);
    else if (mode === 2) {
      addStoneCluster(outerX, outerY, 10, 2);
      addStoneCluster(innerX, innerY, -40, 1);
    }
    // mode 3: clean grass
  } else if (connCount === 3) {
    // T-junction: place in one of the 2 grass corners
    const mode = pSeed % 3;
    if (mode === 0) {
      if (!up) addStoneCluster(50, 20, 15, 2);
      else if (!down) addStoneCluster(50, 80, -15, 2);
      else if (!left) addStoneCluster(20, 50, 25, 2);
      else if (!right) addStoneCluster(80, 50, -25, 2);
    }
  }

  return pebbles;
}

export const RoadSvg: React.FC<{
  connections?: RoadConnections;
  variantSeed?: number;
  isBuildingUnderlay?: boolean;
}> = ({ connections, variantSeed = 0, isBuildingUnderlay = false }) => {
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const up = connections?.up ?? false;
  const down = connections?.down ?? false;
  const left = connections?.left ?? false;
  const right = connections?.right ?? false;
  const connCount =
    (up ? 1 : 0) + (down ? 1 : 0) + (left ? 1 : 0) + (right ? 1 : 0);

  // Dynamic meander wave offset for straight & dead-end segments
  const waveSign = variantSeed % 2 === 0 ? 1 : -1;
  const w = waveSign * (ROAD_CONFIG.meanderAmplitude + (variantSeed % 3) * 0.7);

  // Build smooth centerline SVG path(s).
  // Connected edges are strictly straight & perpendicular at midpoint 50
  // from -16 to 12 (or 88 to 116) so borders always align 100% flush across tiles.
  const segments: string[] = [];

  if (isBuildingUnderlay) {
    // When leading into a building (woodcutter, farm, town hall),
    // road arms travel straight into the center of the tile (50, 50) directly under the building sprite
    if (up) segments.push('M 50 -16 L 50 50');
    if (down) segments.push('M 50 116 L 50 50');
    if (left) segments.push('M -16 50 L 50 50');
    if (right) segments.push('M 116 50 L 50 50');
  } else if (connCount === 0) {
    // Graceful S-curve dirt path for tray icon & isolated road tile
    segments.push('M 14 58 C 36 34, 64 66, 86 42');
  } else if (connCount === 1) {
    if (up) segments.push(`M 50 -16 L 50 12 C 50 28, ${50 + w} 42, ${50 + w * 0.4} 54`);
    if (down) segments.push(`M 50 116 L 50 88 C 50 72, ${50 + w} 58, ${50 + w * 0.4} 46`);
    if (left) segments.push(`M -16 50 L 12 50 C 28 50, 42 ${50 + w}, 54 ${50 + w * 0.4}`);
    if (right) segments.push(`M 116 50 L 88 50 C 72 50, 58 ${50 + w}, 46 ${50 + w * 0.4}`);
  } else if (connCount === 2) {
    if (up && down) {
      segments.push(`M 50 -16 L 50 10 C ${50 + w} 32, ${50 - w} 68, 50 90 L 50 116`);
    } else if (left && right) {
      segments.push(`M -16 50 L 10 50 C 32 ${50 + w}, 68 ${50 - w}, 90 50 L 116 50`);
    } else if (up && right) {
      segments.push('M 50 -16 L 50 15 A 35 35 0 0 0 85 50 L 116 50');
    } else if (up && left) {
      segments.push('M 50 -16 L 50 15 A 35 35 0 0 1 15 50 L -16 50');
    } else if (down && right) {
      segments.push('M 50 116 L 50 85 A 35 35 0 0 1 85 50 L 116 50');
    } else if (down && left) {
      segments.push('M 50 116 L 50 85 A 35 35 0 0 0 15 50 L -16 50');
    }
  } else {
    // 3-way T-junction or 4-way crossroads:
    // Straight arms from -16/116 into center (50, 50) + smooth fillet turns between adjacent arms
    if (up) segments.push('M 50 -16 L 50 50');
    if (down) segments.push('M 50 116 L 50 50');
    if (left) segments.push('M -16 50 L 50 50');
    if (right) segments.push('M 116 50 L 50 50');

    if (up && right) segments.push('M 50 18 A 32 32 0 0 0 82 50');
    if (up && left) segments.push('M 50 18 A 32 32 0 0 1 18 50');
    if (down && right) segments.push('M 50 82 A 32 32 0 0 1 82 50');
    if (down && left) segments.push('M 50 82 A 32 32 0 0 0 18 50');
  }

  const combinedPath = segments.join(' ');
  const texRotation = (variantSeed % 4) * 90;
  const turbSeed = (variantSeed * 17 + 5) % 97;

  // Generate varied, hand-crafted shoulder pebbles
  const pebbles = React.useMemo(
    () => (isBuildingUnderlay ? [] : generatePebblesForTile(connections, variantSeed)),
    [connections, variantSeed, isBuildingUnderlay]
  );

  const vergeFilterId = `road-verge-${uid}`;
  const maskFilterId = `road-mask-filter-${uid}`;
  const centerBlurId = `road-center-blur-${uid}`;
  const roadMaskId = `road-mask-${uid}`;
  const pebbleGradId = `pebble-grad-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className="tile-svg"
      style={{ overflow: 'hidden' }}
    >
      <defs>
        {/* 3D Directional Stone Gradient: #c8b9a7 (light) to #816d5e (dark) */}
        <radialGradient id={pebbleGradId} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#c8b9a7" />
          <stop offset="50%" stopColor="#a49382" />
          <stop offset="100%" stopColor="#816d5e" />
        </radialGradient>

        {/* Soft, wavy grass-to-dirt outer transition filter */}
        <filter
          id={vergeFilterId}
          filterUnits="userSpaceOnUse"
          x="-30"
          y="-30"
          width="160"
          height="160"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={ROAD_CONFIG.roughnessFreq}
            numOctaves="2"
            seed={turbSeed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={ROAD_CONFIG.roughnessScale * 1.15}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="2.2" />
        </filter>

        {/* Organic wavy + softly feathered mask edge for the PNG dirt texture */}
        <filter
          id={maskFilterId}
          filterUnits="userSpaceOnUse"
          x="-30"
          y="-30"
          width="160"
          height="160"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={ROAD_CONFIG.roughnessFreq * 1.15}
            numOctaves="2"
            seed={turbSeed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={ROAD_CONFIG.roughnessScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="wavy"
          />
          <feGaussianBlur in="wavy" stdDeviation="0.9" />
        </filter>

        {/* Soft blur for the lighter center worn track */}
        <filter
          id={centerBlurId}
          filterUnits="userSpaceOnUse"
          x="-30"
          y="-30"
          width="160"
          height="160"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" />
        </filter>

        <mask
          id={roadMaskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x="-30"
          y="-30"
          width="160"
          height="160"
        >
          <rect x="-30" y="-30" width="160" height="160" fill="black" />
          <path
            d={combinedPath}
            fill="none"
            stroke="white"
            strokeWidth={ROAD_CONFIG.earthWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${maskFilterId})`}
          />
        </mask>
      </defs>

      {/*
        Layer 1: Outer grass-to-dirt transition verge & solid dirt border.
        Drawn as solid wide strokes underneath the masked earth texture so borders
        only appear on the OUTSIDE of the road and never create internal lines at junctions.
      */}
      <g filter={`url(#${vergeFilterId})`}>
        <path
          d={combinedPath}
          fill="none"
          stroke="#6f662c"
          strokeWidth={ROAD_CONFIG.vergeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.52"
        />
        <path
          d={combinedPath}
          fill="none"
          stroke="#9e793e"
          strokeWidth={ROAD_CONFIG.borderWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Layer 2: Actual earth_bg3 PNG texture masked on top */}
      <g mask={`url(#${roadMaskId})`}>
        <rect x="0" y="0" width="100" height="100" fill="#e5c285" />
        <image
          href={earthBg3}
          x="-8"
          y="-8"
          width="116"
          height="116"
          preserveAspectRatio="none"
          transform={`rotate(${texRotation} 50 50)`}
        />
        {/* Lighter trodden center track */}
        <path
          d={combinedPath}
          fill="none"
          stroke="#f6e4bc"
          strokeWidth={ROAD_CONFIG.centerTrackWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
          filter={`url(#${centerBlurId})`}
        />
      </g>

      {/* Layer 3: Organic hand-shaded shoulder pebbles matching earth_bg1 & empty_bg1 */}
      {!isBuildingUnderlay && (
        <g className="road-pebbles">
          {pebbles.map((p, idx) => {
            if (p.isSpeck) {
              return (
                <circle
                  key={idx}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.rx}
                  fill="#2b1e16"
                  opacity={0.65}
                />
              );
            }
            return (
              <g
                key={idx}
                transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}
              >
                {/* Cast drop shadow */}
                <ellipse
                  cx={p.cx + 1.2}
                  cy={p.cy + 1.6}
                  rx={p.rx * 1.05}
                  ry={p.ry * 0.9}
                  fill="#1b140d"
                  opacity={0.35}
                />
                {/* Main pebble body with 3D radial gradient */}
                <ellipse
                  cx={p.cx}
                  cy={p.cy}
                  rx={p.rx}
                  ry={p.ry}
                  fill={`url(#${pebbleGradId})`}
                  stroke="#2b1e16"
                  strokeWidth="1.8"
                />
                {/* Sunlit specular rim highlight */}
                <path
                  d={`M ${p.cx - p.rx * 0.55} ${p.cy - p.ry * 0.3} Q ${p.cx - p.rx * 0.1} ${p.cy - p.ry * 0.65} ${p.cx + p.rx * 0.45} ${p.cy - p.ry * 0.4}`}
                  fill="none"
                  stroke="#fffdf6"
                  strokeWidth="1.2"
                  opacity={0.72}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
};
