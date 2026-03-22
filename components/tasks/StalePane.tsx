'use client';

import { TaskItem } from '@/lib/types';
import TaskCard from './TaskCard';

interface StalePaneProps {
  tasks: TaskItem[];
  onComplete: (id: string) => void;
  onSelect: (task: TaskItem) => void;
  onPassBall: (task: TaskItem) => void;
}

const STALE_DAYS = 7;

function isStale(task: TaskItem): boolean {
  if (task.status === 'done' || task.status === 'deleted') return false;
  const updated = new Date(task.updated_at);
  const days = Math.floor((Date.now() - updated.getTime()) / 86400000);
  return days >= STALE_DAYS;
}

export default function StalePane({ tasks, onComplete, onSelect, onPassBall }: StalePaneProps) {
  const staleTasks = tasks.filter(isStale);

  if (staleTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-3">✨</div>
        <p className="text-[14px]">放置タスクはありません</p>
        <p className="text-[12px] mt-1">素晴らしい！タスクをきちんと管理できています</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 p-3 bg-stale-bg rounded-xl border border-stale/20">
        <p className="text-[12px] text-stale font-medium">
          💤 {STALE_DAYS}日以上更新されていないタスクが {staleTasks.length}件 あります
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {staleTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            onSelect={onSelect}
            onPassBall={onPassBall}
          />
        ))}
      </div>
    </div>
  );
}
