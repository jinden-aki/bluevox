'use client';

import { TaskItem, PROJECTS } from '@/lib/types';

interface ProjectPieChartProps {
  items: TaskItem[];
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return date >= weekStart;
}

export default function ProjectPieChart({ items }: ProjectPieChartProps) {
  const thisWeek = items.filter(i =>
    isThisWeek(i.updated_at) && i.status !== 'deleted'
  );
  const total = thisWeek.length || 1;

  const counts = PROJECTS.map(p => ({
    ...p,
    count: thisWeek.filter(i => (i.project || 'other') === p.id).length,
    pct: Math.round((thisWeek.filter(i => (i.project || 'other') === p.id).length / total) * 100),
  }));

  // SVGドーナツチャート
  const radius = 36;
  const cx = 50;
  const cy = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = counts.filter(c => c.count > 0).map(c => {
    const pct = c.count / total;
    const dashArray = circumference * pct;
    const dashOffset = -offset * circumference;
    offset += pct;
    return { ...c, dashArray, dashOffset };
  });

  return (
    <div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="w-20 h-20 flex-shrink-0 -rotate-90">
          {segments.length === 0 ? (
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />
          ) : (
            segments.map((seg, i) => (
              <circle
                key={i}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashArray} ${circumference}`}
                strokeDashoffset={seg.dashOffset}
              />
            ))
          )}
        </svg>
        <div className="flex-1 space-y-1">
          {counts.filter(c => c.count > 0).map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-[12px] text-gray-600">{c.label}</span>
              <span className="text-[12px] font-bold text-ink ml-auto">{c.pct}%</span>
            </div>
          ))}
          {thisWeek.length === 0 && (
            <p className="text-[12px] text-gray-400">今週のデータなし</p>
          )}
        </div>
      </div>
    </div>
  );
}
