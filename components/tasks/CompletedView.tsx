'use client';

import { Item } from '@/lib/types';
import { ACTION_TYPE_CONFIG, ActionType } from '@/lib/task-config';

interface CompletedViewProps {
  items: Item[];
  onItemTap: (item: Item) => void;
}

export default function CompletedView({ items, onItemTap }: CompletedViewProps) {
  const doneItems = items
    .filter(i => i.status === 'done')
    .sort((a, b) => {
      const aTime = a.completed_at || a.updated_at;
      const bTime = b.completed_at || b.updated_at;
      return bTime.localeCompare(aTime);
    });

  if (doneItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        完了したタスクはありません
      </div>
    );
  }

  // Group by date
  const groups: Record<string, Item[]> = {};
  doneItems.forEach(item => {
    const date = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
      : '日付不明';
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
  });

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([date, groupItems]) => (
        <div key={date}>
          <div className="text-xs font-bold text-gray-400 mb-2">{date}</div>
          <div className="space-y-0.5">
            {groupItems.map(item => {
              const actionCfg = ACTION_TYPE_CONFIG[(item.action_type || 'do') as ActionType] || ACTION_TYPE_CONFIG.do;
              return (
                <div
                  key={item.id}
                  onClick={() => onItemTap(item)}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/80 transition cursor-pointer opacity-60 min-h-[44px]"
                >
                  <div className="w-5 h-5 rounded border-2 bg-[#2E7D32] border-[#2E7D32] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-400 line-through flex-1 truncate">{item.title}</span>
                  <span className="text-[10px] text-gray-400">{actionCfg.icon}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
