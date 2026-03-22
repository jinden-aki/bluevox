'use client';

import { useState } from 'react';
import { TaskItem } from '@/lib/types';
import { PROJECTS } from '@/lib/types';
import { ACTION_TYPE_CONFIG } from '@/lib/task-config';
import type { ActionType } from '@/lib/task-config';
import TaskCard from './TaskCard';

interface TaskListPaneProps {
  tasks: TaskItem[];
  onComplete: (id: string) => void;
  onSelect: (task: TaskItem) => void;
  onPassBall: (task: TaskItem) => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

function MobileTaskCard({
  task,
  onComplete,
  onDelete,
  onTap,
}: {
  task: TaskItem;
  onComplete: (id: string) => void;
  onDelete?: (id: string) => void;
  onTap: () => void;
}) {
  const [touchStartX, setTouchStartX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const actionCfg = ACTION_TYPE_CONFIG[(task.action_type || 'do') as ActionType] || ACTION_TYPE_CONFIG.do;
  const project = PROJECTS.find(p => p.id === task.project);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX;
    if (Math.abs(diff) > 5) setSwiping(true);
    setSwipeOffset(Math.max(-80, Math.min(80, diff)));
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 60) {
      onComplete(task.id);
    } else if (swipeOffset < -60 && onDelete) {
      onDelete(task.id);
    }
    setSwipeOffset(0);
    setSwiping(false);
  };

  const handleClick = () => {
    if (!swiping) onTap();
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 mb-3 active:bg-gray-50 transition-transform relative overflow-hidden"
      style={{ transform: `translateX(${swipeOffset}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {/* Project color strip */}
      {project && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ backgroundColor: project.color }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-medium leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.is_today_focus && <span className="text-yellow-500 mr-1">⭐</span>}
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="text-[11px] px-1.5 py-0.5 rounded font-medium"
              style={{ color: actionCfg.color, backgroundColor: actionCfg.bg }}
            >
              {actionCfg.icon} {actionCfg.label}
            </span>
            {task.due && <span className="text-[11px] text-gray-400">· {task.due}</span>}
            {task.estimated_minutes && <span className="text-[11px] text-gray-400">· {task.estimated_minutes}分</span>}
          </div>
          {project && (
            <span
              className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: project.color + '18', color: project.color }}
            >
              {project.icon} {project.label}
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onComplete(task.id); }}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-green-50 rounded-xl text-green-600 text-lg active:bg-green-100"
        >
          {task.status === 'done' ? '✅' : '○'}
        </button>
      </div>

      {/* Swipe hint indicators */}
      {swipeOffset > 30 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-green-500 text-lg opacity-70">✅</div>
      )}
      {swipeOffset < -30 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 text-lg opacity-70">🗑️</div>
      )}
    </div>
  );
}

export default function TaskListPane({
  tasks,
  onComplete,
  onSelect,
  onPassBall,
  onDelete,
  emptyMessage = 'タスクはありません',
}: TaskListPaneProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-[14px]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: swipe cards */}
      <div className="md:hidden px-4 py-3">
        {tasks.map(task => (
          <MobileTaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            onDelete={onDelete}
            onTap={() => onSelect(task)}
          />
        ))}
      </div>

      {/* Desktop: existing task cards */}
      <div className="hidden md:flex flex-col gap-2 p-4">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            onSelect={onSelect}
            onPassBall={onPassBall}
          />
        ))}
      </div>
    </>
  );
}
