import React from 'react';
import { BuildingType, PlaceableType, TileType } from '../engine/types';

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
  [treeImg, rockImg, tileBgImg, earthBg1, earthBg2, earthBg3, emptyBg1, emptyBg2, emptyBg3].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export const TreeGraphic: React.FC = () => (
  <img
    src={treeImg}
    alt="Tree"
    className="tile-obstacle-img"
    draggable={false}
  />
);

export const RockGraphic: React.FC = () => (
  <img
    src={rockImg}
    alt="Rock"
    className="tile-obstacle-img"
    draggable={false}
  />
);

export interface BuildingSpriteProps {
  type: BuildingType;
  isNewlyBuilt?: boolean;
}

export const BuildingSprite: React.FC<BuildingSpriteProps> = ({
  type,
  isNewlyBuilt = false
}) => {
  const assets = BUILDING_STAGE_ASSETS[type];
  if (!assets) return null;

  return (
    <div
      className={`building-sprite-container ${isNewlyBuilt ? 'is-animating-build' : ''}`}
      aria-label={type}
    >
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
    </div>
  );
};

interface TileGraphicProps {
  type: TileType;
  markedEmpty?: boolean;
  ruledOutForActiveType?: PlaceableType | null;
  excludedCount?: number;
  excludedTypes?: Set<PlaceableType>;
  roadConnections?: RoadConnections;
  variantSeed?: number;
  isNewlyBuilt?: boolean;
}

export const TileGraphic: React.FC<TileGraphicProps> = ({
  type,
  markedEmpty = false,
  ruledOutForActiveType = null,
  excludedCount = 0,
  excludedTypes,
  roadConnections,
  variantSeed = 0,
  isNewlyBuilt = false
}) => {
  switch (type) {
    case 'tree':
      return <TreeGraphic />;
    case 'rock':
      return <RockGraphic />;
    case 'house':
    case 'woodcutter':
    case 'farm':
    case 'town_hall':
      return <BuildingSprite type={type} isNewlyBuilt={isNewlyBuilt} />;
    case 'road':
      return <RoadSvg connections={roadConnections} />;
    case 'empty':
    default:
      if (markedEmpty) {
        return null;
      }
      return (
        <CornerRuledOutIconsSvg
          excludedTypes={
            excludedTypes ??
            (ruledOutForActiveType ? new Set([ruledOutForActiveType]) : undefined)
          }
          activeType={ruledOutForActiveType}
        />
      );
  }
};

const QUADRANT_BUILDINGS: Array<{
  type: BuildingType;
  cx: number;
  cy: number;
  label: string;
}> = [
  { type: 'woodcutter', cx: 25, cy: 25, label: 'No Woodcutter' },
  { type: 'farm', cx: 75, cy: 25, label: 'No Farm' },
  { type: 'house', cx: 25, cy: 75, label: 'No House' },
  { type: 'town_hall', cx: 75, cy: 75, label: 'No Town Hall' }
];

function renderCornerBadge(
  type: BuildingType,
  cx: number,
  cy: number,
  isActive: boolean
) {
  const scale = 0.50;
  return (
    <g
      key={type}
      transform={`translate(${cx - 50 * scale}, ${cy - 50 * scale}) scale(${scale})`}
      className={isActive ? 'ruled-out-corner-active' : undefined}
      aria-label={`No ${type}`}
    >
      {/* Warm ivory / parchment token backing */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="#fffbf2"
        stroke="#2c1a0e"
        strokeWidth="4.5"
        opacity="0.97"
      />

      {/* Miniature silhouette of the ruled-out building */}
      <g opacity="0.75" transform="translate(8, 8) scale(0.84)">
        {type === 'woodcutter' && <WoodcutterSvg />}
        {type === 'farm' && <FarmSvg />}
        {type === 'house' && <HouseSvg />}
        {type === 'town_hall' && <TownHallSvg />}
      </g>

      {/* Crisp red ban circle & diagonal slash (crossed out icon) */}
      <circle
        cx="50"
        cy="50"
        r="39"
        fill="rgba(224, 79, 68, 0.16)"
        stroke="#c93b2b"
        strokeWidth="7"
      />
      <line
        x1="23"
        y1="23"
        x2="77"
        y2="77"
        stroke="#c93b2b"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Active highlight ring if this corner matches the player's active tool */}
      {isActive && (
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="#f59f00"
          strokeWidth="5.5"
          strokeDasharray="9 6"
        />
      )}
    </g>
  );
}

/**
 * 4 Quadrant crossed-out icons for ruled-out buildings on an empty tile:
 * - Top-Left: NO WOODCUTTER
 * - Top-Right: NO FARM
 * - Bottom-Left: NO HOUSE
 * - Bottom-Right: NO TOWN HALL
 */
export const CornerRuledOutIconsSvg: React.FC<{
  excludedTypes?: Set<PlaceableType>;
  activeType?: PlaceableType | null;
}> = ({ excludedTypes, activeType }) => {
  if (!excludedTypes || excludedTypes.size === 0) return null;

  const activeBuildings = QUADRANT_BUILDINGS.filter((q) =>
    excludedTypes.has(q.type)
  );

  if (activeBuildings.length === 0) return null;

  return (
    <svg viewBox="0 0 100 100" className="tile-svg" aria-label="Ruled out building marks">
      {activeBuildings.map((q) =>
        renderCornerBadge(q.type, q.cx, q.cy, activeType === q.type)
      )}
    </svg>
  );
};

const EmptyGroundSvg: React.FC<{ seed: number; excludedCount?: number }> = ({
  excludedCount = 0
}) => {
  if (excludedCount <= 0) return null;
  return null;
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

export const RoadSvg: React.FC<{ connections?: RoadConnections }> = ({
  connections
}) => {
  const up = connections?.up ?? false;
  const down = connections?.down ?? false;
  const left = connections?.left ?? false;
  const right = connections?.right ?? false;
  const anyConn = up || down || left || right;

  // Default to horizontal plank bridge if isolated/tray icon
  const showH = !anyConn || left || right;
  const showV = up || down;

  return (
    <svg viewBox="0 0 100 100" className="tile-svg">
      {/* Subtle dirt path bed under planks */}
      <circle cx="50" cy="50" r="24" fill="#b89058" opacity="0.7" />
      {up && <rect x="30" y="0" width="40" height="50" fill="#b89058" opacity="0.7" />}
      {down && <rect x="30" y="50" width="40" height="50" fill="#b89058" opacity="0.7" />}
      {left && <rect x="0" y="30" width="50" height="40" fill="#b89058" opacity="0.7" />}
      {right && <rect x="50" y="30" width="50" height="40" fill="#b89058" opacity="0.7" />}

      {/* Vertical road planks */}
      {up && (
        <g>
          {[8, 22, 36].map((y) => (
            <rect
              key={`u-${y}`}
              x="28"
              y={y}
              width="44"
              height="10"
              rx="3"
              fill="#a86b38"
              stroke="#2b1e16"
              strokeWidth="2"
            />
          ))}
        </g>
      )}
      {down && (
        <g>
          {[54, 68, 82].map((y) => (
            <rect
              key={`d-${y}`}
              x="28"
              y={y}
              width="44"
              height="10"
              rx="3"
              fill="#a86b38"
              stroke="#2b1e16"
              strokeWidth="2"
            />
          ))}
        </g>
      )}

      {/* Horizontal road planks */}
      {left && (
        <g>
          {[8, 22, 36].map((x) => (
            <rect
              key={`l-${x}`}
              x={x}
              y="28"
              width="10"
              height="44"
              rx="3"
              fill="#a86b38"
              stroke="#2b1e16"
              strokeWidth="2"
            />
          ))}
        </g>
      )}
      {right && (
        <g>
          {[54, 68, 82].map((x) => (
            <rect
              key={`r-${x}`}
              x={x}
              y="28"
              width="10"
              height="44"
              rx="3"
              fill="#a86b38"
              stroke="#2b1e16"
              strokeWidth="2"
            />
          ))}
        </g>
      )}

      {/* Center hub / default diagonal plank icon when not connected */}
      {!anyConn ? (
        <g transform="rotate(-25 50 50)">
          {[-24, -12, 0, 12, 24].map((offset) => (
            <rect
              key={offset}
              x="22"
              y={45 + offset}
              width="56"
              height="9"
              rx="2.5"
              fill="#b5763f"
              stroke="#2b1e16"
              strokeWidth="2"
            />
          ))}
        </g>
      ) : (
        <rect
          x="32"
          y="32"
          width="36"
          height="36"
          rx="6"
          fill="#b5763f"
          stroke="#2b1e16"
          strokeWidth="2"
        />
      )}
      {anyConn && (showH || showV) && (
        <circle cx="50" cy="50" r="4" fill="#824f24" />
      )}
    </svg>
  );
};
