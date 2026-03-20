'use client';

interface LoopPair {
  strengthName: string;
  strengthId?: string;
  weaknessName: string;
  weaknessId?: string;
  reason?: string;
}

interface StrengthWeaknessLoopProps {
  pairs: LoopPair[];
}

export default function StrengthWeaknessLoop({ pairs }: StrengthWeaknessLoopProps) {
  const items = pairs.slice(0, 3);
  if (items.length === 0) return null;

  const rowH = 64;
  const totalH = items.length * rowH + 16;
  const leftX = 100;
  const rightX = 600;
  const midX = 350;

  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) + '...' : s;

  return (
    <svg viewBox={`0 0 700 ${totalH}`} className="w-full" style={{ maxHeight: totalH }}>
      <defs>
        <marker id="arrow-r" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <path d="M0,0 L7,2.5 L0,5" fill="#94a3b8" />
        </marker>
        <marker id="arrow-l" markerWidth="7" markerHeight="5" refX="0" refY="2.5" orient="auto">
          <path d="M7,0 L0,2.5 L7,5" fill="#94a3b8" />
        </marker>
      </defs>

      {items.map((pair, i) => {
        const cy = 32 + i * rowH;
        const r = 24;

        return (
          <g key={i}>
            {/* Strength circle (blue) */}
            <circle cx={leftX} cy={cy} r={r} fill="#1565C0" />
            {pair.strengthId && (
              <text x={leftX} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
                fontSize="7" fill="rgba(255,255,255,0.5)" fontWeight="700">
                {pair.strengthId}
              </text>
            )}
            <text x={leftX} y={cy + 6} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="#fff" fontWeight="600"
              fontFamily="'Noto Sans JP', sans-serif">
              {truncate(pair.strengthName, 8)}
            </text>

            {/* Arrow: strength → weakness (top) */}
            <line
              x1={leftX + r + 8} y1={cy - 6}
              x2={rightX - r - 8} y2={cy - 6}
              stroke="#94a3b8" strokeWidth="1" markerEnd="url(#arrow-r)"
            />

            {/* Arrow: weakness → strength (bottom) */}
            <line
              x1={rightX - r - 8} y1={cy + 6}
              x2={leftX + r + 8} y2={cy + 6}
              stroke="#94a3b8" strokeWidth="1" markerEnd="url(#arrow-l)"
            />

            {/* Reason label on arrow */}
            {pair.reason && (
              <text x={midX} y={cy - 14} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill="#64748b" fontStyle="italic"
                fontFamily="'Noto Sans JP', sans-serif">
                {truncate(pair.reason, 24)}
              </text>
            )}

            {/* Weakness circle (red) */}
            <circle cx={rightX} cy={cy} r={r} fill="#C83232" />
            {pair.weaknessId && (
              <text x={rightX} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
                fontSize="7" fill="rgba(255,255,255,0.5)" fontWeight="700">
                {pair.weaknessId}
              </text>
            )}
            <text x={rightX} y={cy + 6} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="#fff" fontWeight="600"
              fontFamily="'Noto Sans JP', sans-serif">
              {truncate(pair.weaknessName, 8)}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${midX - 60}, ${totalH - 12})`}>
        <circle cx={0} cy={0} r={5} fill="#1565C0" />
        <text x={10} y={1} fontSize="8" fill="#64748b" dominantBaseline="middle"
          fontFamily="'Noto Sans JP', sans-serif">強み</text>
        <circle cx={50} cy={0} r={5} fill="#C83232" />
        <text x={60} y={1} fontSize="8" fill="#64748b" dominantBaseline="middle"
          fontFamily="'Noto Sans JP', sans-serif">その影</text>
      </g>
    </svg>
  );
}
