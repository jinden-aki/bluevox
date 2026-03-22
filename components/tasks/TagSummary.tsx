'use client';

import { TaskItem } from '@/lib/types';

interface TagSummaryProps {
  tasks: TaskItem[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
}

export default function TagSummary({ tasks, activeTag, onTagClick }: TagSummaryProps) {
  const tagCounts: Record<string, number> = {};
  tasks.forEach(t => {
    (t.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedTags.length === 0) return null;

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
      <button
        onClick={() => onTagClick(null)}
        className={`flex-shrink-0 text-[12px] px-2.5 py-1 rounded-full border transition-colors ${
          !activeTag ? 'bg-jinden-blue text-white border-jinden-blue' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        すべて
      </button>
      {sortedTags.map(([tag, count]) => (
        <button
          key={tag}
          onClick={() => onTagClick(activeTag === tag ? null : tag)}
          className={`flex-shrink-0 text-[12px] px-2.5 py-1 rounded-full border transition-colors ${
            activeTag === tag ? 'bg-jinden-blue text-white border-jinden-blue' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          #{tag} <span className="opacity-60">{count}</span>
        </button>
      ))}
    </div>
  );
}
