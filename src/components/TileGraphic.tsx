import React from 'react';
import { PlaceableType, TileType } from '../engine/types';

export interface RoadConnections {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

interface TileGraphicProps {
  type: TileType;
  markedEmpty?: boolean;
  ruledOutForActiveType?: PlaceableType | null;
  excludedCount?: number;
  roadConnections?: RoadConnections;
  variantSeed?: number;
}

export const TileGraphic: React.FC<TileGraphicProps> = ({
  type,
  markedEmpty = false,
  ruledOutForActiveType = null,
  excludedCount = 0,
  roadConnections,
  variantSeed = 0
}) => {
  switch (type) {
    case 'tree':
      return <TreeSvg />;
    case 'rock':
      return <RockSvg />;
    case 'house':
      return <HouseSvg />;
    case 'woodcutter':
      return <WoodcutterSvg />;
    case 'farm':
      return <FarmSvg />;
    case 'town_hall':
      return <TownHallSvg />;
    case 'road':
      return <RoadSvg connections={roadConnections} />;
    case 'empty':
    default:
      if (markedEmpty) {
        return <MarkedGrassSvg />;
      }
      if (ruledOutForActiveType) {
        return <RuledOutBuildingSvg excludedType={ruledOutForActiveType} />;
      }
      return (
        <EmptyGroundSvg
          seed={variantSeed}
          excludedCount={excludedCount}
        />
      );
  }
};

const EmptyGroundSvg: React.FC<{ seed: number; excludedCount?: number }> = ({
  seed,
  excludedCount = 0
}) => {
  const v = seed % 3;
  return (
    <svg viewBox="0 0 100 100" className="tile-svg">
      <ellipse cx="50" cy="52" rx="34" ry="30" fill="#cfa96e" opacity="0.55" />
      {v === 0 && (
        <>
          <circle cx="34" cy="36" r="3" fill="#b38b52" />
          <circle cx="66" cy="68" r="3.5" fill="#b38b52" />
        </>
      )}
      {v === 1 && (
        <>
          <circle cx="64" cy="34" r="3" fill="#b38b52" />
          <circle cx="42" cy="70" r="3.5" fill="#b38b52" />
        </>
      )}
      {v === 2 && (
        <>
          <circle cx="32" cy="62" r="3" fill="#b38b52" />
          <circle cx="67" cy="44" r="2.8" fill="#b38b52" />
        </>
      )}
      {/* Subtle bottom-left pips indicating how many other building types were ruled out here */}
      {excludedCount > 0 && (
        <g>
          {Array.from({ length: Math.min(excludedCount, 4) }, (_, idx) => (
            <circle
              key={idx}
              cx={16 + idx * 12}
              cy={86}
              r="4"
              fill="#b84a39"
              stroke="#2b1e16"
              strokeWidth="2"
              opacity="0.85"
            />
          ))}
        </g>
      )}
    </svg>
  );
};

/**
 * Contextual "Cannot be [Active Building]" overlay shown only when that building is selected in the tray.
 */
export const RuledOutBuildingSvg: React.FC<{
  excludedType: PlaceableType;
}> = ({ excludedType }) => (
  <svg viewBox="0 0 100 100" className="tile-svg">
    <ellipse cx="50" cy="52" rx="34" ry="30" fill="#c2995e" opacity="0.55" />
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
    <ellipse cx="50" cy="52" rx="34" ry="30" fill="#cfa96e" opacity="0.45" />
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
              strokeWidth="3.2"
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
              strokeWidth="3.2"
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
              strokeWidth="3.2"
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
              strokeWidth="3.2"
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
              strokeWidth="3.2"
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
          strokeWidth="3.5"
        />
      )}
      {anyConn && (showH || showV) && (
        <circle cx="50" cy="50" r="4" fill="#824f24" />
      )}
    </svg>
  );
};
