'use client';

interface Strength {
  verb_name: string;
  verb_id?: string;
  scene?: string;
}

interface StrengthMapProps {
  coreSentence: string;
  strengths: Strength[];
}

export default function StrengthMap({ coreSentence, strengths }: StrengthMapProps) {
  const items = strengths.slice(0, 3);
  if (items.length === 0) return null;

  const cx = 350;
  const cy = 130;
  const coreR = 60;
  const verbR = 36;
  const _sceneR = 120;

  // Position satellites evenly
  const angles = items.length === 1
    ? [0]
    : items.length === 2
    ? [-40, 40]
    : [-50, 0, 50];

  const verbPositions = angles.map((deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    const dist = 150;
    return { x: cx + Math.cos(rad) * dist, y: cy + Math.sin(rad) * dist };
  });

  const scenePositions = angles.map((deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    const dist = 260;
    return { x: cx + Math.cos(rad) * dist, y: cy + Math.sin(rad) * dist };
  });

  // Truncate text to fit
  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) + '...' : s;

  return (
    <svg viewBox="0 0 700 300" className="w-full" style={{ maxHeight: 280 }}>
      <defs>
        <filter id="sm-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.08" />
        </filter>
        <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#1565C0" opacity="0.4" />
        </marker>
      </defs>

      {/* Connection lines */}
      {verbPositions.map((vp, i) => (
        <g key={`line-${i}`}>
          <line
            x1={cx} y1={cy} x2={vp.x} y2={vp.y}
            stroke="#1565C0" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.25"
          />
          {items[i].scene && (
            <line
              x1={vp.x} y1={vp.y} x2={scenePositions[i].x} y2={scenePositions[i].y}
              stroke="#1565C0" strokeWidth="1" strokeDasharray="3 3" opacity="0.2"
              markerEnd="url(#arrow-blue)"
            />
          )}
        </g>
      ))}

      {/* Scene boxes */}
      {items.map((item, i) => {
        if (!item.scene) return null;
        const sp = scenePositions[i];
        const w = 130;
        const h = 36;
        return (
          <g key={`scene-${i}`}>
            <rect
              x={sp.x - w / 2} y={sp.y - h / 2}
              width={w} height={h} rx={8}
              fill="#F0F7FF" stroke="#E3ECFA" strokeWidth="1"
            />
            <text
              x={sp.x} y={sp.y + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="#1565C0" fontWeight="500"
              fontFamily="'Noto Sans JP', sans-serif"
            >
              {truncate(item.scene, 16)}
            </text>
          </g>
        );
      })}

      {/* Verb satellites */}
      {verbPositions.map((vp, i) => (
        <g key={`verb-${i}`} filter="url(#sm-shadow)">
          <circle cx={vp.x} cy={vp.y} r={verbR} fill="#1565C0" />
          {items[i].verb_id && (
            <text
              x={vp.x} y={vp.y - 8}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="rgba(255,255,255,0.6)" fontWeight="700"
              fontFamily="'Cormorant Garamond', serif"
            >
              {items[i].verb_id}
            </text>
          )}
          <text
            x={vp.x} y={vp.y + 6}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fill="#fff" fontWeight="600"
            fontFamily="'Noto Sans JP', sans-serif"
          >
            {truncate(items[i].verb_name, 8)}
          </text>
        </g>
      ))}

      {/* Center core */}
      <g filter="url(#sm-shadow)">
        <circle cx={cx} cy={cy} r={coreR} fill="#0A1628" />
        <circle cx={cx} cy={cy} r={coreR - 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <foreignObject x={cx - 50} y={cy - 24} width={100} height={48}>
          <div
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: 9,
              color: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '0 4px',
            }}
          >
            {truncate(coreSentence, 28)}
          </div>
        </foreignObject>
      </g>
    </svg>
  );
}
