'use client';

import { TaskItem } from '@/lib/types';

interface GanttChartProps {
  tasks: TaskItem[];
  onSelect: (task: TaskItem) => void;
}

function getWeekDates(): Date[] {
  const today = new Date();
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    dates.push(d);
  }
  return dates;
}

function parseDue(due: string | null): Date | null {
  if (!due) return null;
  if (/今日/.test(due)) return new Date();
  if (/明日/.test(due)) { const d = new Date(); d.setDate(d.getDate() + 1); return d; }
  if (/今週/.test(due)) { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay())); return d; }
  const m = due.match(/(\d+)\/(\d+)/);
  if (m) {
    const d = new Date();
    d.setMonth(parseInt(m[1]) - 1);
    d.setDate(parseInt(m[2]));
    return d;
  }
  return null;
}

export default function GanttChart({ tasks, onSelect }: GanttChartProps) {
  const weekDates = getWeekDates();
  const today = new Date();

  const activeTasks = tasks.filter(t =>
    t.status !== 'done' && t.status !== 'deleted' && t.due
  ).slice(0, 20);

  const DOW = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex">
            <div className="w-36 flex-shrink-0" />
            {weekDates.map(d => (
              <div
                key={d.toISOString()}
                className={`flex-1 text-center text-[11px] py-1 font-medium ${
                  d.toDateString() === today.toDateString() ? 'text-jinden-blue font-bold' : 'text-gray-500'
                }`}
              >
                {d.getDate()}/{DOW[d.getDay()]}
              </div>
            ))}
          </div>

          {/* Rows */}
          {activeTasks.length === 0 ? (
            <div className="text-center text-[14px] text-gray-400 py-12">期限付きタスクがありません</div>
          ) : (
            activeTasks.map(task => {
              const dueDate = parseDue(task.due);
              return (
                <div key={task.id} className="flex items-center border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(task)}>
                  <div className="w-36 flex-shrink-0 px-2 py-2">
                    <p className="text-[12px] text-ink truncate">{task.title}</p>
                  </div>
                  {weekDates.map(d => {
                    const isDue = dueDate && d.toDateString() === dueDate.toDateString();
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                      <div
                        key={d.toISOString()}
                        className={`flex-1 py-2.5 flex items-center justify-center ${isToday ? 'bg-blue-50' : ''}`}
                      >
                        {isDue && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: task.priority >= 3 ? '#C62828' : task.priority >= 2 ? '#F57F17' : '#2E7D32' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
