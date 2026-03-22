'use client';

import { useState } from 'react';
import { TaskItem } from '@/lib/types';
import { showToast } from '@/components/ui/Toast';

interface BallTrackerProps {
  tasks: TaskItem[];
  onSelect: (task: TaskItem) => void;
  onPassBall: (task: TaskItem) => void;
}

function getBallDays(passedAt: string | null): number {
  if (!passedAt) return 0;
  return Math.floor((Date.now() - new Date(passedAt).getTime()) / 86400000);
}

function getDayColor(days: number): { text: string; bg: string } {
  if (days >= 6) return { text: '#C62828', bg: '#FFEBEE' };
  if (days >= 3) return { text: '#F57F17', bg: '#FFF8E1' };
  return { text: '#2E7D32', bg: '#E8F5E9' };
}

export default function BallTracker({ tasks, onSelect, onPassBall }: BallTrackerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const otherBallTasks = tasks.filter(t =>
    t.ball_holder === 'other' && t.status !== 'done' && t.status !== 'deleted'
  );

  // 名前でグループ化
  const grouped = otherBallTasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
    const name = task.ball_holder_name || '不明';
    if (!acc[name]) acc[name] = [];
    acc[name].push(task);
    return acc;
  }, {});

  const copyReminder = (task: TaskItem) => {
    const msg = `${task.ball_holder_name}さん、先日お話しした「${task.title}」の件、進捗いかがでしょうか？`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(task.id);
      showToast('コピーしました', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (otherBallTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-3">🏀</div>
        <p className="text-[14px]">相手ボールのタスクはありません</p>
        <p className="text-[12px] mt-1">自分のボールのタスクをこなしましょう</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {Object.entries(grouped).map(([name, groupTasks]) => (
        <div key={name}>
          <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">{name}</h3>
          <div className="space-y-2">
            {groupTasks.map(task => {
              const days = getBallDays(task.ball_passed_at);
              const colors = getDayColor(days);
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-100 p-3 cursor-pointer hover:border-gray-200 transition-colors"
                  onClick={() => onSelect(task)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] text-ink">{task.title}</p>
                    <span
                      className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: colors.text, backgroundColor: colors.bg }}
                    >
                      {days}日経過
                      {days >= 6 && ' 🔴'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={e => { e.stopPropagation(); copyReminder(task); }}
                      className="text-[12px] px-3 py-1 rounded-lg border border-jinden-blue/30 text-jinden-blue hover:bg-mist transition-colors"
                    >
                      {copiedId === task.id ? '✓ コピー済み' : 'リマインドをコピー'}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onPassBall(task); }}
                      className="text-[12px] px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      ボール戻す
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
