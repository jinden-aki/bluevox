'use client';

import { TaskItem } from '@/lib/types';
import { ACTION_TYPE_CONFIG, PRIORITY_INT_MAP } from '@/lib/task-config';
import { PROJECTS } from '@/lib/types';

interface TaskCardProps {
  task: TaskItem;
  onComplete: (id: string) => void;
  onSelect: (task: TaskItem) => void;
  onPassBall?: (task: TaskItem) => void;
}

function getBallDays(passedAt: string | null): number {
  if (!passedAt) return 0;
  return Math.floor((Date.now() - new Date(passedAt).getTime()) / 86400000);
}

function getBallColor(days: number): string {
  if (days >= 6) return '#C62828';
  if (days >= 3) return '#F9A825';
  return '#2E7D32';
}

export default function TaskCard({ task, onComplete, onSelect, onPassBall }: TaskCardProps) {
  const actionCfg = ACTION_TYPE_CONFIG[task.action_type as keyof typeof ACTION_TYPE_CONFIG] || ACTION_TYPE_CONFIG.do;
  const priorityInfo = PRIORITY_INT_MAP[task.priority as keyof typeof PRIORITY_INT_MAP];
  const project = PROJECTS.find(p => p.id === task.project);
  const isOtherBall = task.ball_holder === 'other';
  const ballDays = isOtherBall ? getBallDays(task.ball_passed_at) : 0;
  const ballColor = getBallColor(ballDays);

  return (
    <div
      className={`
        relative flex items-start gap-3 px-4 py-3 bg-white rounded-xl border
        transition-all cursor-pointer task-slide-up
        ${task.is_today_focus ? 'border-jinden-blue/40 shadow-sm' : 'border-gray-100 hover:border-gray-200'}
        ${task.status === 'done' ? 'opacity-40' : ''}
      `}
      onClick={() => onSelect(task)}
    >
      {/* Project color strip */}
      {project && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ backgroundColor: project.color }}
        />
      )}

      {/* Complete button */}
      <button
        onClick={e => { e.stopPropagation(); onComplete(task.id); }}
        className={`
          mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
          transition-colors
          ${task.status === 'done'
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-jinden-blue'}
        `}
        aria-label="完了"
      >
        {task.status === 'done' && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[14px] leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-ink'}`}>
            {task.is_today_focus && <span className="text-yellow-500 mr-1">⭐</span>}
            {task.title}
          </p>

          {/* Ball badge */}
          {isOtherBall && (
            <button
              onClick={e => { e.stopPropagation(); onPassBall?.(task); }}
              className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
              style={{ color: ballColor, backgroundColor: ballColor + '18' }}
            >
              🏀 {task.ball_holder_name || '相手'}{ballDays > 0 && ` (${ballDays}日)`}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Action type */}
          <span
            className="text-[11px] px-1.5 py-0.5 rounded font-medium"
            style={{ color: actionCfg.color, backgroundColor: actionCfg.bg }}
          >
            {actionCfg.icon} {actionCfg.label}
          </span>

          {/* Priority */}
          {priorityInfo?.dot && (
            <span className="text-[11px]">{priorityInfo.dot}</span>
          )}

          {/* Due */}
          {task.due && (
            <span className="text-[11px] text-gray-400">{task.due}</span>
          )}

          {/* Tags */}
          {task.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="text-[11px] text-gray-400">#{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
