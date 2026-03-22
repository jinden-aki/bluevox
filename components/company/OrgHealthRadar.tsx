'use client';

interface RadarAxis {
  axis: string;
  score: number;
  evidence: string;
}

interface OrgHealthRadarProps {
  axes: RadarAxis[];
  size?: number;
}

export default function OrgHealthRadar({ axes, size = 240 }: OrgHealthRadarProps) {
  if (!axes || axes.length === 0) return null;

  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const levels = 5;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (r: number, i: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  const labelPoint = (i: number) => {
    const r = maxR + 22;
    return point(r, i);
  };

  // Grid rings
  const rings = Array.from({ length: levels }, (_, i) => {
    const r = (maxR / levels) * (i + 1);
    const pts = Array.from({ length: n }, (_, j) => point(r, j));
    return pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
  });

  // Score polygon
  const scorePath = axes.map((ax, i) => {
    const r = (Math.min(Math.max(ax.score, 0), 10) / 10) * maxR;
    const p = point(r, i);
    return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
  }).join(' ') + 'Z';

  // Spoke lines
  const spokes = Array.from({ length: n }, (_, i) => {
    const p = point(maxR, i);
    return `M${cx},${cy} L${p.x},${p.y}`;
  });

  return (
    <div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#E5E7EB" strokeWidth={1} />
        ))}
        {/* Spokes */}
        {spokes.map((d, i) => (
          <path key={i} d={d} stroke="#E5E7EB" strokeWidth={1} />
        ))}
        {/* Score polygon */}
        <path d={scorePath} fill="#1565C020" stroke="#1565C0" strokeWidth={2} />
        {/* Score dots */}
        {axes.map((ax, i) => {
          const r = (Math.min(Math.max(ax.score, 0), 10) / 10) * maxR;
          const p = point(r, i);
          return <circle key={i} cx={p.x} cy={p.y} r={4} fill="#1565C0" />;
        })}
        {/* Labels */}
        {axes.map((ax, i) => {
          const lp = labelPoint(i);
          const textAnchor =
            lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle';
          return (
            <text
              key={i}
              x={lp.x}
              y={lp.y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize={10}
              fill="#374151"
              fontWeight="600"
            >
              {ax.axis}
            </text>
          );
        })}
        {/* Score values */}
        {axes.map((ax, i) => {
          const r = (Math.min(Math.max(ax.score, 0), 10) / 10) * maxR;
          const p = point(r, i);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize={9}
              fill="#1565C0"
              fontWeight="700"
            >
              {ax.score}
            </text>
          );
        })}
      </svg>
      {/* Evidence list */}
      <div className="mt-3 space-y-1.5">
        {axes.map((ax, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]">
            <span className="font-semibold text-gray-700 w-16 flex-shrink-0">{ax.axis}</span>
            <span className="text-[11px] font-bold text-jinden-blue w-6 flex-shrink-0">{ax.score}/10</span>
            <span className="text-gray-500">{ax.evidence}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
