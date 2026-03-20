'use client';

interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-xs text-gray-500 flex-shrink-0">
        {completed} / {total} 完了
      </span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#2E7D32] rounded-full progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
    </div>
  );
}
