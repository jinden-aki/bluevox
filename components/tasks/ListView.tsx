'use client';

import { Item, ItemStatus } from '@/lib/types';
import { getTagStyle, PRESET_TAGS } from '@/lib/tags';

interface ListViewProps {
  items: Item[];
  onToggleComplete: (id: string, currentStatus: ItemStatus) => void;
  onCardClick: (item: Item) => void;
  onDelete: (id: string) => void;
}

export default function ListView({ items, onToggleComplete, onCardClick, onDelete }: ListViewProps) {
  // Group by tag, ungrouped last
  const grouped: Record<string, Item[]> = {};
  const ungrouped: Item[] = [];

  items.forEach(item => {
    if (item.tags.length > 0) {
      const primary = item.tags[0];
      if (!grouped[primary]) grouped[primary] = [];
      grouped[primary].push(item);
    } else {
      ungrouped.push(item);
    }
  });

  // Sort each group by due date
  const sortByDue = (a: Item, b: Item) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  };

  const allGroups: { label: string; color: string; items: Item[] }[] = [];

  // Preset tags first
  Object.keys(PRESET_TAGS).forEach(tag => {
    if (grouped[tag]) {
      allGroups.push({
        label: `#${tag}`,
        color: PRESET_TAGS[tag].color,
        items: grouped[tag].sort(sortByDue),
      });
      delete grouped[tag];
    }
  });

  // Remaining custom tags
  Object.entries(grouped).forEach(([tag, tagItems]) => {
    allGroups.push({
      label: `#${tag}`,
      color: '#616161',
      items: tagItems.sort(sortByDue),
    });
  });

  // Ungrouped
  if (ungrouped.length > 0) {
    allGroups.push({
      label: 'タグなし',
      color: '#9E9E9E',
      items: ungrouped.sort(sortByDue),
    });
  }

  return (
    <div className="space-y-5">
      {allGroups.map(group => (
        <div key={group.label}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group.label}</span>
            <span className="text-[10px] text-gray-400">({group.items.length})</span>
          </div>
          <div className="space-y-1">
            {group.items.map(item => (
              <ListItem
                key={item.id}
                item={item}
                onToggle={() => onToggleComplete(item.id, item.status)}
                onClick={() => onCardClick(item)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
      {allGroups.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          タスクがありません
        </div>
      )}
    </div>
  );
}

function ListItem({
  item,
  onToggle,
  onClick,
  onDelete,
}: {
  item: Item;
  onToggle: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const isDone = item.status === 'done';
  const isOverdue = item.due_date && !isDone && new Date(item.due_date) < new Date(new Date().toDateString());

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/80 transition group cursor-pointer"
      onClick={onClick}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition min-w-[20px] ${
          isDone
            ? 'bg-[#2E7D32] border-[#2E7D32] text-white'
            : 'border-gray-300 hover:border-jinden-blue'
        }`}
      >
        {isDone && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={`text-sm flex-1 min-w-0 truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
        {item.title}
      </span>
      {item.tags.map(tag => {
        const style = getTagStyle(tag);
        return (
          <span
            key={tag}
            className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ color: style.color, backgroundColor: style.bg }}
          >
            #{tag}
          </span>
        );
      })}
      {item.due_date && (
        <span className={`text-[11px] flex-shrink-0 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {item.due_date.slice(5)}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition flex-shrink-0 p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
