'use client';

import { TaskItem } from '@/lib/types';
import TaskCard from './TaskCard';

interface TaskListPaneProps {
  tasks: TaskItem[];
  onComplete: (id: string) => void;
  onSelect: (task: TaskItem) => void;
  onPassBall: (task: TaskItem) => void;
  emptyMessage?: string;
}

export default function TaskListPane({
  tasks,
  onComplete,
  onSelect,
  onPassBall,
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
    <div className="flex flex-col gap-2 p-4">
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
  );
}
