'use client';

import { TaskItem } from '@/lib/types';
import ProjectPieChart from './ProjectPieChart';

interface MorningDashboardProps {
  tasks: TaskItem[];
  todayFocusTasks: TaskItem[];
  otherBallTasks: TaskItem[];
  onShowList: () => void;
  onAddTask: () => void;
  onSelectTask: (task: TaskItem) => void;
  onComplete?: (id: string) => void;
}

function getGreeting(hour: number): string {
  if (hour < 10) return 'おはよう、じんでん。';
  if (hour < 14) return '午前の集中タイム。';
  if (hour < 18) return '午後、ギアを上げろ。';
  return '今日の振り返り。';
}

function getBallDays(passedAt: string | null): number {
  if (!passedAt) return 0;
  return Math.floor((Date.now() - new Date(passedAt).getTime()) / 86400000);
}

function getBallBadge(days: number): string {
  if (days >= 6) return '🔴';
  if (days >= 3) return '🟡';
  return '🟢';
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return date >= weekStart;
}

export default function MorningDashboard({
  tasks,
  todayFocusTasks,
  otherBallTasks,
  onShowList,
  onAddTask,
  onSelectTask,
  onComplete,
}: MorningDashboardProps) {
  const hour = new Date().getHours();
  const today = new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });

  const thisWeekItems = tasks.filter(t => isThisWeek(t.updated_at) && t.status !== 'deleted');
  const thisWeekDone = thisWeekItems.filter(t => t.status === 'done');
  const completionRate = thisWeekItems.length > 0
    ? Math.round((thisWeekDone.length / thisWeekItems.length) * 100)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ===== Mobile layout ===== */}
      <div className="md:hidden space-y-0 pb-4">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[13px] text-gray-500">{today}</p>
          <h1 className="text-[20px] font-semibold text-ink mt-0.5">{getGreeting(hour)}</h1>
          <p className="text-[12px] text-jinden-blue mt-1.5 font-medium truncate">
            🎯 BLUEVOXセッションを5人に届ける
          </p>
        </div>

        {/* Today Focus cards */}
        <div className="px-4 pb-3">
          <p className="text-[13px] font-semibold text-gray-700 mb-3">⭐ 今日のフォーカス</p>
          {todayFocusTasks.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
              <p className="text-[13px] text-yellow-700">フォーカス未設定</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayFocusTasks.map(t => (
                <div
                  key={t.id}
                  className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between gap-3"
                >
                  <button
                    onClick={() => onSelectTask(t)}
                    className="flex-1 text-left"
                  >
                    <p className={`text-[14px] leading-snug ${t.status === 'done' ? 'line-through text-gray-400' : 'text-ink'}`}>
                      {t.title}
                    </p>
                  </button>
                  {onComplete && t.status !== 'done' && (
                    <button
                      onClick={() => onComplete(t.id)}
                      className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-green-50 rounded-xl text-green-600 text-lg active:bg-green-100"
                    >
                      ✅
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ball summary */}
        {otherBallTasks.length > 0 && (
          <div className="mx-4 mb-3 bg-white border border-orange-100 rounded-xl p-3.5">
            <p className="text-[13px] font-medium text-orange-700">
              🏀 相手ボール {otherBallTasks.length}件
            </p>
            <div className="mt-2 space-y-1">
              {otherBallTasks.slice(0, 3).map(t => {
                const days = getBallDays(t.ball_passed_at);
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="w-full text-left flex items-center justify-between"
                  >
                    <span className="text-[13px] text-ink truncate">{t.ball_holder_name || '相手'}</span>
                    <span className="text-[12px] text-gray-400 flex-shrink-0 ml-2">{days}日 {getBallBadge(days)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Completion summary */}
        <div className="mx-4 bg-white border border-green-100 rounded-xl p-3.5">
          <p className="text-[12px] font-bold text-green-700 mb-2">📊 今週の完了</p>
          <div className="flex items-center gap-3">
            <span className="text-[28px] font-bold text-ink">{thisWeekDone.length}</span>
            <div className="flex-1">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{completionRate}% ({thisWeekItems.length}件中)</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Desktop layout ===== */}
      <div className="hidden md:block">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] text-gray-500">{today}</p>
              <h1 className="text-[20px] font-semibold text-ink mt-0.5">{getGreeting(hour)}</h1>
            </div>
          </div>
          <p className="text-[12px] text-jinden-blue mt-1.5 font-medium">
            🎯 BLUEVOXセッションを5人に届ける
          </p>
        </div>

        {/* Grid */}
        <div className="px-4 grid grid-cols-2 gap-3 pb-6">
          {/* Today Focus */}
          <div className="bg-white rounded-2xl border border-yellow-100 p-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-yellow-700 uppercase tracking-wider mb-3">⭐ 今日のフォーカス</h2>
            {todayFocusTasks.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">未設定</p>
            ) : (
              <div className="space-y-2">
                {todayFocusTasks.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="w-full text-left flex items-start gap-2"
                  >
                    <span className="text-[12px] font-bold text-gray-400 mt-0.5 w-4">{i + 1}.</span>
                    <span className={`text-[13px] leading-snug ${t.status === 'done' ? 'line-through text-gray-400' : 'text-ink'}`}>
                      {t.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Other Ball */}
          <div className="bg-white rounded-2xl border border-orange-100 p-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-orange-700 uppercase tracking-wider mb-3">🏀 相手ボール</h2>
            {otherBallTasks.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">相手ボールなし</p>
            ) : (
              <div className="space-y-2">
                {otherBallTasks.slice(0, 4).map(t => {
                  const days = getBallDays(t.ball_passed_at);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className="w-full text-left flex items-center justify-between gap-2"
                    >
                      <span className="text-[13px] text-ink truncate">{t.ball_holder_name || '相手'}</span>
                      <span className="text-[12px] text-gray-400 flex-shrink-0">{days}日 {getBallBadge(days)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">📊 今週の配分</h2>
            <ProjectPieChart items={tasks} />
          </div>

          {/* Completion */}
          <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-green-700 uppercase tracking-wider mb-3">✅ 今週の完了</h2>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-[32px] font-bold text-ink">{thisWeekDone.length}</span>
              <span className="text-[14px] text-gray-400 mb-1">/ {thisWeekItems.length} タスク</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-[12px] text-gray-400 mt-1">{completionRate}%</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-6 flex gap-3">
          <button
            onClick={onShowList}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-[14px] text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            📋 タスク一覧を見る
          </button>
          <button
            onClick={onAddTask}
            className="flex-1 py-3 rounded-xl bg-jinden-blue text-white text-[14px] font-semibold hover:bg-jinden-blue/90 transition-colors"
          >
            + 新規タスク
          </button>
        </div>
      </div>
    </div>
  );
}
