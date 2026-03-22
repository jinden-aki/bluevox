'use client';

import { TaskItem } from '@/lib/types';

interface FocusCardsProps {
  tasks: TaskItem[];
  onComplete: (id: string) => void;
  onSelect: (task: TaskItem) => void;
}

const PRIORITY_COLORS = ['#C62828', '#E65100', '#2E7D32'];

export default function FocusCards({ tasks, onComplete, onSelect }: FocusCardsProps) {
  if (tasks.length === 0) return null;

  const allDone = tasks.every(t => t.status === 'done');

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-yellow-700 tracking-wide">⭐ 今日のフォーカス</span>
        {allDone && (
          <span className="text-[11px] text-green-600 font-medium">🎉 完了！</span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tasks.map((task, i) => (
          <button
            key={task.id}
            onClick={() => onSelect(task)}
            className="flex-shrink-0 flex flex-col gap-2 p-3 bg-white rounded-xl border border-yellow-100 shadow-sm min-w-[140px] text-left hover:shadow-md transition-shadow"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: task.status === 'done' ? '#22C55E' : PRIORITY_COLORS[i % 3] }}
            />
            <p className={`text-[12px] leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-ink'}`}>
              {task.title}
            </p>
            <button
              onClick={e => { e.stopPropagation(); onComplete(task.id); }}
              className={`
                self-start text-[11px] px-2 py-0.5 rounded-lg border font-medium transition-colors
                ${task.status === 'done'
                  ? 'border-green-200 bg-green-50 text-green-600'
                  : 'border-jinden-blue/30 text-jinden-blue hover:bg-mist'}
              `}
            >
              {task.status === 'done' ? '✓ 完了' : '完了'}
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
