'use client';

import { useState } from 'react';
import { TaskItem } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface FocusGateProps {
  tasks: TaskItem[];
  onComplete: (selectedIds: string[]) => void;
  onSkip: () => void;
}

export default function FocusGate({ tasks, onComplete, onSkip }: FocusGateProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = tasks
    .filter(t => t.status !== 'done' && t.status !== 'deleted' && t.type === 'task')
    .slice(0, 20);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const ids = Array.from(selected);
    const today = new Date().toISOString().slice(0, 10);
    await Promise.all(ids.map(id =>
      supabase.from('items').update({
        is_today_focus: true,
        focus_selected_date: today,
        status: 'today',
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    ));
    onComplete(ids);
  };

  return (
    <>
      {/* Mobile: white full-screen */}
      <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-ink">⭐ 今日のフォーカスを3つ選ぼう</h2>
          <p className="text-xs text-gray-500 mt-1">選択中: {selected.size}/3</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {candidates.map(task => {
            const isSelected = selected.has(task.id);
            const isDisabled = !isSelected && selected.size >= 3;
            return (
              <div
                key={task.id}
                onClick={() => !isDisabled && toggle(task.id)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-jinden-blue bg-mist'
                    : isDisabled
                      ? 'border-gray-100 bg-gray-50 opacity-40'
                      : 'border-gray-200 bg-white active:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-ink">{task.title}</span>
                  {isSelected && <span className="text-jinden-blue text-xl font-bold">✓</span>}
                </div>
              </div>
            );
          })}
          {candidates.length === 0 && (
            <p className="text-gray-400 text-center py-8 text-[14px]">タスクがありません。まず追加しましょう。</p>
          )}
        </div>

        <div className="px-4 py-4 border-t border-gray-200 bg-white" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onSkip}
            className="w-full mb-3 py-3 rounded-xl border border-gray-200 text-gray-500 text-[14px] min-h-[44px]"
          >
            スキップ
          </button>
          <button
            disabled={selected.size === 0}
            onClick={handleConfirm}
            className={`w-full py-4 rounded-xl text-[15px] font-semibold min-h-[44px] transition-colors ${
              selected.size > 0
                ? 'bg-jinden-blue text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {selected.size > 0 ? `この${selected.size}つに集中する 🔥` : 'タスクを選んでください'}
          </button>
        </div>
      </div>

      {/* Desktop: dark overlay */}
      <div className="hidden md:flex fixed inset-0 z-50 bg-midnight/95 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">⭐</div>
            <h2 className="text-white text-[20px] font-semibold">今日のフォーカスを選ぼう</h2>
            <p className="text-wash/70 text-[13px] mt-1">最大3つ選択してください</p>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-6">
            {candidates.map(task => {
              const isSelected = selected.has(task.id);
              const isDisabled = !isSelected && selected.size >= 3;
              return (
                <button
                  key={task.id}
                  onClick={() => toggle(task.id)}
                  disabled={isDisabled}
                  className={`
                    w-full text-left px-4 py-3 rounded-xl border transition-all
                    ${isSelected
                      ? 'border-yellow-400 bg-yellow-400/10 text-white'
                      : isDisabled
                        ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                        : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-yellow-400 bg-yellow-400' : 'border-white/30'}`}>
                      {isSelected && <svg className="w-3 h-3 text-midnight" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-[14px]">{task.title}</span>
                  </div>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <p className="text-white/50 text-center py-8 text-[14px]">タスクがありません。まず追加しましょう。</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 text-[14px] hover:bg-white/5 transition-colors"
            >
              スキップ
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="flex-2 flex-grow-[2] py-3 rounded-xl bg-yellow-400 text-midnight text-[14px] font-semibold disabled:opacity-40 transition-colors hover:bg-yellow-300"
            >
              この{selected.size}つに集中する ⭐
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
