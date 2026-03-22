'use client';

import { useState } from 'react';
import { TaskItem } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface BallPassModalProps {
  task: TaskItem;
  onClose: () => void;
  onSave: (updated: TaskItem) => void;
}

export default function BallPassModal({ task, onClose, onSave }: BallPassModalProps) {
  const [name, setName] = useState(task.ball_holder_name || '');
  const [remindDays, setRemindDays] = useState(task.ball_remind_days || 3);
  const [saving, setSaving] = useState(false);

  const handlePass = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('items')
      .update({
        ball_holder: 'other',
        ball_holder_name: name.trim(),
        ball_passed_at: new Date().toISOString(),
        ball_remind_days: remindDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .select()
      .single();
    setSaving(false);
    if (data) {
      onSave(data as TaskItem);
      onClose();
    }
  };

  const handleReturn = async () => {
    setSaving(true);
    const { data } = await supabase
      .from('items')
      .update({
        ball_holder: 'self',
        ball_holder_name: null,
        ball_passed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .select()
      .single();
    setSaving(false);
    if (data) {
      onSave(data as TaskItem);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="w-full md:max-w-sm bg-white rounded-t-2xl md:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-ink">🏀 ボールの受け渡し</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-[13px] text-gray-600 mb-4 line-clamp-2">{task.title}</p>

        {task.ball_holder === 'other' && (
          <div className="mb-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
            <p className="text-[12px] text-orange-700">
              現在 <strong>{task.ball_holder_name}</strong> さんにボールあり
            </p>
            <button
              onClick={handleReturn}
              disabled={saving}
              className="mt-2 w-full py-2 text-[13px] font-medium text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors"
            >
              自分に戻す
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">渡す相手</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="山田さん"
              className="mt-1 w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-jinden-blue"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">リマインド (日後)</label>
            <div className="flex gap-2 mt-1">
              {[1, 3, 5, 7].map(d => (
                <button
                  key={d}
                  onClick={() => setRemindDays(d)}
                  className={`flex-1 py-2 rounded-lg text-[13px] border transition-all ${remindDays === d ? 'border-jinden-blue bg-mist text-jinden-blue' : 'border-gray-200 text-gray-500'}`}
                >
                  {d}日
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handlePass}
          disabled={saving || !name.trim()}
          className="mt-5 w-full py-3 text-[14px] font-semibold text-white bg-jinden-blue rounded-xl disabled:opacity-40 hover:bg-jinden-blue/90 transition-colors"
        >
          {saving ? '保存中...' : `${name || '相手'}にボールを渡す 🏀`}
        </button>
      </div>
    </div>
  );
}
