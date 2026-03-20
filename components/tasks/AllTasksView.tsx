'use client';

import { useState } from 'react';
import { Item } from '@/lib/types';
import { ACTION_TYPE_CONFIG, ACTION_TYPE_ORDER, PRIORITY_INT_MAP } from '@/lib/task-config';

interface AllTasksViewProps {
  items: Item[];
  onItemTap: (item: Item) => void;
  onToggleComplete: (id: string) => void;
}

export default function AllTasksView({ items, onItemTap, onToggleComplete }: AllTasksViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Only non-done tasks
  const activeItems = items.filter(i => i.status !== 'done');

  // Group by action_type
  const groups = ACTION_TYPE_ORDER.map(type => {
    const cfg = ACTION_TYPE_CONFIG[type];
    const groupItems = activeItems
      .filter(i => (i.action_type || 'do') === type)
      .sort((a, b) => b.priority - a.priority);

    // For contact type, count unique persons
    let personCount = 0;
    if (type === 'contact') {
      const allPersons = new Set<string>();
      groupItems.forEach(i => {
        (i.contact_persons || []).forEach(p => allPersons.add(p));
      });
      personCount = allPersons.size;
    }

    return { type, cfg, items: groupItems, personCount };
  }).filter(g => g.items.length > 0);

  if (activeItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        タスクがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(group => {
        const isCollapsed = collapsed[group.type];
        const countLabel = group.type === 'contact' && group.personCount > 0
          ? `${group.items.length}グループ · ${group.personCount}人`
          : `${group.items.length}`;

        return (
          <div key={group.type}>
            {/* Group header */}
            <button
              onClick={() => setCollapsed(prev => ({ ...prev, [group.type]: !prev[group.type] }))}
              className="flex items-center gap-2 w-full text-left py-2 group"
            >
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                {group.cfg.icon} {group.cfg.label} ({countLabel})
              </span>
              <div className="flex-1 h-px bg-gray-200" />
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Group items */}
            {!isCollapsed && (
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <TaskRow
                    key={item.id}
                    item={item}
                    onTap={() => onItemTap(item)}
                    onToggle={() => onToggleComplete(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({ item, onTap, onToggle }: { item: Item; onTap: () => void; onToggle: () => void }) {
  const priCfg = PRIORITY_INT_MAP[item.priority] || PRIORITY_INT_MAP[0];
  const isDone = item.status === 'done';
  const contacts = item.contact_persons || [];

  return (
    <div
      onClick={onTap}
      className={`flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-white/80 transition cursor-pointer min-h-[44px] ${isDone ? 'opacity-40' : ''}`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition mt-0.5 min-w-[20px] ${
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {priCfg.dot && <span className="text-[10px]">{priCfg.dot}</span>}
          <span className={`text-[15px] font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.title}
          </span>
        </div>

        {/* Meta line */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.due && (
            <span className="text-xs text-gray-400">{item.due}</span>
          )}
          {item.estimated_minutes && (
            <span className="text-xs text-gray-400">
              ⏱{item.estimated_minutes >= 60 ? `${Math.floor(item.estimated_minutes / 60)}h` : `${item.estimated_minutes}m`}
            </span>
          )}
          {item.project && (
            <span className="text-xs text-gray-400">{item.project}</span>
          )}
        </div>

        {/* Contact persons */}
        {contacts.length > 0 && (
          <div className="text-xs mt-0.5" style={{ color: '#7C3AED' }}>
            👤 {contacts.length <= 3
              ? contacts.join(', ')
              : `${contacts.slice(0, 2).join(', ')} 他${contacts.length - 2}名`
            }
          </div>
        )}
      </div>
    </div>
  );
}
