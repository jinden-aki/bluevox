'use client';

import { Item } from '@/lib/types';
import { ACTION_TYPE_CONFIG, PRIORITY_INT_MAP, ActionType } from '@/lib/task-config';
import HeroCard from './HeroCard';
import ProgressBar from './ProgressBar';

interface FocusViewProps {
  items: Item[];
  focusItems: Item[];
  completedToday: number;
  totalToday: number;
  onComplete: (id: string) => void;
  onItemTap: (item: Item) => void;
  onAISuggest: () => void;
  onGoToAll: () => void;
}

export default function FocusView({
  items: _items,
  focusItems,
  completedToday,
  totalToday,
  onComplete,
  onItemTap,
  onAISuggest,
  onGoToAll,
}: FocusViewProps) {
  const hero = focusItems[0] || null;
  const subs = focusItems.slice(1, 3);
  const allFocusDone = focusItems.length === 0 && completedToday > 0;

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <HeroCard
        item={hero}
        onComplete={onComplete}
        onTap={onItemTap}
        allDone={allFocusDone}
        onAISuggest={onAISuggest}
        onSelectManual={onGoToAll}
      />

      {/* Sub cards */}
      {subs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">次にやること</div>
          <div className="grid grid-cols-2 gap-2.5">
            {subs.map(item => (
              <SubCard key={item.id} item={item} onTap={onItemTap} />
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <ProgressBar completed={completedToday} total={totalToday} />
    </div>
  );
}

function SubCard({ item, onTap }: { item: Item; onTap: (item: Item) => void }) {
  const actionCfg = ACTION_TYPE_CONFIG[(item.action_type || 'do') as ActionType] || ACTION_TYPE_CONFIG.do;
  const priCfg = PRIORITY_INT_MAP[item.priority] || PRIORITY_INT_MAP[0];

  return (
    <div
      onClick={() => onTap(item)}
      className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:shadow-sm transition relative overflow-hidden"
      style={{ minHeight: 100 }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ backgroundColor: actionCfg.color }}
      />

      <div className="pl-2">
        {priCfg.dot && <div className="text-[10px] mb-1">{priCfg.dot}</div>}
        <div className="text-sm font-medium text-gray-900 leading-snug mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span>{actionCfg.icon}</span>
          {item.due && (
            <>
              <span>·</span>
              <span>{item.due}</span>
            </>
          )}
          {item.estimated_minutes && (
            <>
              <span>·</span>
              <span>{item.estimated_minutes >= 60 ? `${Math.floor(item.estimated_minutes / 60)}h` : `${item.estimated_minutes}m`}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
