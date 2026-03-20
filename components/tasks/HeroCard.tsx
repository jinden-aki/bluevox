'use client';

import { useState, useCallback } from 'react';
import { Item } from '@/lib/types';
import { ACTION_TYPE_CONFIG, PRIORITY_INT_MAP, ActionType } from '@/lib/task-config';

interface HeroCardProps {
  item: Item | null;
  onComplete: (id: string) => void;
  onTap: (item: Item) => void;
  allDone: boolean;
  onAISuggest: () => void;
  onSelectManual: () => void;
}

export default function HeroCard({ item, onComplete, onTap, allDone, onAISuggest, onSelectManual }: HeroCardProps) {
  const [completing, setCompleting] = useState(false);

  const handleComplete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item || completing) return;
    setCompleting(true);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);

    setTimeout(() => {
      onComplete(item.id);
      setCompleting(false);
    }, 800);
  }, [item, completing, onComplete]);

  // All done state
  if (allDone) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-base font-bold text-gray-900 mb-1">今日のフォーカス全完了！</div>
        <div className="text-sm text-gray-500">お疲れ。今日はもう何もしなくていい。</div>
        <button
          onClick={onSelectManual}
          className="mt-4 text-sm text-jinden-blue hover:underline"
        >
          まだやる → タスク一覧
        </button>
      </div>
    );
  }

  // Empty state
  if (!item) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="text-2xl mb-2">☀️</div>
        <div className="text-base font-bold text-gray-900 mb-3">今日やることを決めよう</div>
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={onAISuggest}
            className="text-sm text-white px-5 py-2.5 rounded-lg min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #0A1628, #1565C0)' }}
          >
            🤖 AIに選んでもらう
          </button>
          <button
            onClick={onSelectManual}
            className="text-sm text-jinden-blue hover:underline"
          >
            自分で選ぶ →
          </button>
        </div>
      </div>
    );
  }

  const actionCfg = ACTION_TYPE_CONFIG[(item.action_type || 'do') as ActionType] || ACTION_TYPE_CONFIG.do;
  const priCfg = PRIORITY_INT_MAP[item.priority] || PRIORITY_INT_MAP[0];

  return (
    <div
      onClick={() => onTap(item)}
      className={`bg-white border border-gray-200 rounded-2xl relative overflow-hidden cursor-pointer min-h-[160px] ${completing ? 'hero-complete' : ''}`}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-2xl"
        style={{ backgroundColor: actionCfg.color }}
      />

      <div className="p-5 pl-7">
        {/* Priority dot */}
        {priCfg.dot && (
          <div className="text-xs mb-2">{priCfg.dot}</div>
        )}

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 leading-snug mb-3" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-4">
          <span>{actionCfg.icon} {actionCfg.label}</span>
          {item.due && (
            <>
              <span>·</span>
              <span>{item.due}</span>
            </>
          )}
          {item.estimated_minutes && (
            <>
              <span>·</span>
              <span>⏱{item.estimated_minutes >= 60 ? `${Math.floor(item.estimated_minutes / 60)}h` : `${item.estimated_minutes}m`}</span>
            </>
          )}
        </div>

        {/* Complete button */}
        <div className="flex justify-center">
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-8 py-2.5 rounded-[10px] text-sm font-medium text-white min-h-[44px] transition"
            style={{ backgroundColor: completing ? '#2E7D32' : '#0A1628', width: 200 }}
          >
            {completing ? '✅ 完了！' : '✅ 完了する'}
          </button>
        </div>
      </div>
    </div>
  );
}
