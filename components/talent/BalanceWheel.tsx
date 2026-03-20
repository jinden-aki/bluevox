'use client';

interface WheelAxis {
  name: string;
  importance_rank?: number;
  importance?: number;
  satisfaction?: number;
  gap_meaning?: string;
}

interface BalanceWheelProps {
  axes: WheelAxis[];
  className?: string;
}

function safeNum(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || isNaN(v)) return fallback;
  return v;
}

function impVal(ax: WheelAxis): number {
  if (typeof ax.importance_rank === 'number' && !isNaN(ax.importance_rank)) {
    return (9 - ax.importance_rank) / 8;
  }
  if (typeof ax.importance === 'number' && !isNaN(ax.importance)) {
    return ax.importance / 10;
  }
  return 0.5;
}

function satVal(ax: WheelAxis): number {
  const s = safeNum(ax.satisfaction, 0);
  return Math.max(0, s / 10);
}

export default function BalanceWheel({ axes: rawAxes, className = '' }: BalanceWheelProps) {
  const axes = (rawAxes || []).filter(ax => ax && ax.name);
  if (axes.length === 0) return null;
  const n = axes.length;

  // Fallback: 1 axis -> bar chart
  if (n === 1) {
    const ax = axes[0];
    const imp = impVal(ax);
    const sat = satVal(ax);
    return (
      <svg viewBox="0 0 400 200" className={`w-full block ${className}`} style={{ maxHeight: 200 }}>
        <text x={200} y={20} textAnchor="middle" fontFamily="var(--font-body)" fontSize={12} fill="var(--gray-700)" fontWeight={600}>
          {ax.name}
        </text>
        <rect x={80} y={40} width={240 * imp} height={30} rx={4} fill="rgba(21,101,192,.15)" stroke="var(--jinden)" strokeWidth={1} strokeDasharray="4,2" />
        <text x={75} y={60} textAnchor="end" fontFamily="var(--font-body)" fontSize={10} fill="var(--gray-500)">
          重要度
        </text>
        <rect x={80} y={85} width={240 * sat} height={30} rx={4} fill="rgba(21,101,192,.25)" stroke="var(--jinden)" strokeWidth={2} />
        <text x={75} y={105} textAnchor="end" fontFamily="var(--font-body)" fontSize={10} fill="var(--gray-500)">
          充足度
        </text>
      </svg>
    );
  }

  // Fallback: 2 axes -> stacked bar chart
  if (n === 2) {
    return (
      <svg viewBox="0 0 400 220" className={`w-full block ${className}`} style={{ maxHeight: 220 }}>
        {axes.map((ax, i) => {
          const yOff = i * 100;
          const imp = impVal(ax);
          const sat = satVal(ax);
          return (
            <g key={i}>
              <text x={200} y={yOff + 18} textAnchor="middle" fontFamily="var(--font-body)" fontSize={11} fill="var(--gray-700)" fontWeight={600}>
                {ax.name}
              </text>
              <rect x={80} y={yOff + 28} width={240 * imp} height={24} rx={4} fill="rgba(21,101,192,.15)" stroke="var(--jinden)" strokeWidth={1} strokeDasharray="4,2" />
              <text x={75} y={yOff + 45} textAnchor="end" fontFamily="var(--font-body)" fontSize={9} fill="var(--gray-500)">
                重要度
              </text>
              <rect x={80} y={yOff + 60} width={240 * sat} height={24} rx={4} fill="rgba(21,101,192,.25)" stroke="var(--jinden)" strokeWidth={2} />
              <text x={75} y={yOff + 77} textAnchor="end" fontFamily="var(--font-body)" fontSize={9} fill="var(--gray-500)">
                充足度
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // 3+ axes -> radar chart
  const w = 400;
  const h = 400;
  const cx = w / 2;
  const cy = h / 2;
  const r = 140;
  const angleStep = (2 * Math.PI) / n;

  const gridCircles = [0.2, 0.4, 0.6, 0.8, 1.0];

  const impPoints = axes.map((ax, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    let val = impVal(ax);
    if (val < 0) val = 0.5;
    const px = cx + r * val * Math.cos(angle);
    const py = cy + r * val * Math.sin(angle);
    return `${isNaN(px) ? cx : px},${isNaN(py) ? cy : py}`;
  }).join(' ');

  const satPoints = axes.map((ax, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = satVal(ax);
    const px = cx + r * val * Math.cos(angle);
    const py = cy + r * val * Math.sin(angle);
    return `${isNaN(px) ? cx : px},${isNaN(py) ? cy : py}`;
  }).join(' ');

  const satDots = axes.map((ax, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = satVal(ax);
    let px = cx + r * val * Math.cos(angle);
    let py = cy + r * val * Math.sin(angle);
    if (isNaN(px)) px = cx;
    if (isNaN(py)) py = cy;
    return { px, py };
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full block ${className}`}>
      {/* Grid circles */}
      {gridCircles.map(f => (
        <circle
          key={f}
          cx={cx}
          cy={cy}
          r={r * f}
          fill="none"
          stroke="var(--gray-300)"
          strokeWidth={0.5}
          strokeDasharray={f < 1 ? '2,2' : '0'}
        />
      ))}

      {/* Axis lines + labels */}
      {axes.map((ax, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const lx = cx + r * Math.cos(angle);
        const ly = cy + r * Math.sin(angle);
        const ex = cx + r * 1.15 * Math.cos(angle);
        const ey = cy + r * 1.15 * Math.sin(angle);
        const anchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={lx} y2={ly} stroke="var(--gray-300)" strokeWidth={0.5} />
            <text
              x={ex}
              y={ey + 4}
              textAnchor={anchor}
              fontFamily="var(--font-body)"
              fontSize={9}
              fill="var(--gray-700)"
              fontWeight={500}
            >
              {ax.name}
            </text>
          </g>
        );
      })}

      {/* Importance polygon (outer, dashed) */}
      <polygon points={impPoints} fill="rgba(21,101,192,.08)" stroke="var(--jinden)" strokeWidth={1} strokeDasharray="4,2" />

      {/* Satisfaction polygon (inner, solid) */}
      <polygon points={satPoints} fill="rgba(21,101,192,.15)" stroke="var(--jinden)" strokeWidth={2} />

      {/* Satisfaction dots */}
      {satDots.map((d, i) => (
        <circle key={i} cx={d.px} cy={d.py} r={4} fill="var(--jinden)" stroke="var(--white)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
