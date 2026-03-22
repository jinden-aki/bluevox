'use client';

import { useState, useEffect } from 'react';
import { TaskItem } from '@/lib/types';
import { PROJECTS } from '@/lib/types';
import { ACTION_TYPE_CONFIG, ACTION_TYPE_ORDER } from '@/lib/task-config';
import { supabase } from '@/lib/supabase';

interface TaskEditModalProps {
  task: TaskItem | null;
  onClose: () => void;
  onSave: (updated: TaskItem) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'inbox',       label: 'インボックス' },
  { value: 'this_week',   label: '今週中' },
  { value: 'today',       label: '今日' },
  { value: 'in_progress', label: '作業中' },
  { value: 'done',        label: '完了' },
];

export default function TaskEditModal({ task, onClose, onSave, onDelete }: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [actionType, setActionType] = useState('do');
  const [status, setStatus] = useState('inbox');
  const [priority, setPriority] = useState(0);
  const [due, setDue] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [project, setProject] = useState('');
  const [notes, setNotes] = useState('');
  const [ballHolder, setBallHolder] = useState<'self' | 'other'>('self');
  const [ballHolderName, setBallHolderName] = useState('');
  const [isTodayFocus, setIsTodayFocus] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setActionType(task.action_type || 'do');
    setStatus(task.status);
    setPriority(task.priority || 0);
    setDue(task.due || '');
    setEstimatedMinutes(task.estimated_minutes ? String(task.estimated_minutes) : '');
    setProject(task.project || '');
    setNotes((task as TaskItem).notes || task.body || '');
    setBallHolder((task as TaskItem).ball_holder || 'self');
    setBallHolderName((task as TaskItem).ball_holder_name || '');
    setIsTodayFocus((task as TaskItem).is_today_focus || false);
  }, [task]);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const updates: any = {
      title,
      action_type: actionType,
      status,
      priority,
      due: due || null,
      estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      project: project || null,
      notes: notes || null,
      ball_holder: ballHolder,
      ball_holder_name: ballHolder === 'other' ? ballHolderName : null,
      is_today_focus: isTodayFocus,
      focus_selected_date: isTodayFocus ? today : null,
      updated_at: new Date().toISOString(),
    };
    if (status === 'done' && task.status !== 'done') {
      updates.completed_at = new Date().toISOString();
    }

    const { data } = await supabase
      .from('items')
      .update(updates)
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
      <div className="w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-ink">タスク編集</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">タイトル</label>
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-jinden-blue"
              rows={2}
            />
          </div>

          {/* Action type */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">アクションタイプ</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {ACTION_TYPE_ORDER.map(at => {
                const cfg = ACTION_TYPE_CONFIG[at];
                return (
                  <button
                    key={at}
                    onClick={() => setActionType(at)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all"
                    style={actionType === at
                      ? { backgroundColor: cfg.bg, borderColor: cfg.color, color: cfg.color }
                      : { borderColor: '#E5E7EB', color: '#6B7280' }
                    }
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ステータス</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="mt-1 w-full text-[14px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-jinden-blue"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">優先度</label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="mt-1 w-full text-[14px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-jinden-blue"
              >
                <option value={0}>なし</option>
                <option value={1}>🟢 低</option>
                <option value={2}>🟡 中</option>
                <option value={3}>🔴 高</option>
              </select>
            </div>
          </div>

          {/* Due + Estimated */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">期限</label>
              <input
                type="text"
                value={due}
                onChange={e => setDue(e.target.value)}
                placeholder="例: 今週中、3/25"
                className="mt-1 w-full text-[14px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-jinden-blue"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">所要時間(分)</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(e.target.value)}
                placeholder="30"
                className="mt-1 w-full text-[14px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-jinden-blue"
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">プロジェクト</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              <button
                onClick={() => setProject('')}
                className={`px-2 py-1 rounded text-[12px] border transition-all ${!project ? 'border-jinden-blue bg-mist text-jinden-blue' : 'border-gray-200 text-gray-500'}`}
              >
                なし
              </button>
              {PROJECTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProject(p.id)}
                  className="px-2 py-1 rounded text-[12px] border transition-all"
                  style={project === p.id
                    ? { borderColor: p.color, backgroundColor: p.color + '18', color: p.color }
                    : { borderColor: '#E5E7EB', color: '#6B7280' }
                  }
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ball holder */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ボール</label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setBallHolder('self')}
                className={`flex-1 py-2 rounded-lg text-[13px] border transition-all ${ballHolder === 'self' ? 'border-jinden-blue bg-mist text-jinden-blue' : 'border-gray-200 text-gray-500'}`}
              >
                🏀 自分
              </button>
              <button
                onClick={() => setBallHolder('other')}
                className={`flex-1 py-2 rounded-lg text-[13px] border transition-all ${ballHolder === 'other' ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}
              >
                🏀 相手
              </button>
            </div>
            {ballHolder === 'other' && (
              <input
                type="text"
                value={ballHolderName}
                onChange={e => setBallHolderName(e.target.value)}
                placeholder="相手の名前"
                className="mt-2 w-full text-[14px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-jinden-blue"
              />
            )}
          </div>

          {/* Today focus */}
          <div className="flex items-center justify-between py-2 border border-yellow-200 rounded-xl px-3 bg-yellow-50">
            <div>
              <p className="text-[13px] font-medium text-yellow-800">⭐ 今日のフォーカス</p>
              <p className="text-[11px] text-yellow-600">今日の最重要タスクに設定</p>
            </div>
            <button
              onClick={() => setIsTodayFocus(!isTodayFocus)}
              className={`w-12 h-6 rounded-full transition-colors ${isTodayFocus ? 'bg-yellow-400' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isTodayFocus ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">メモ</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="補足情報..."
              className="mt-1 w-full text-[14px] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-jinden-blue"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { if (confirm('削除しますか？')) { onDelete(task.id); onClose(); } }}
            className="px-4 py-2.5 text-[13px] text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            削除
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-[13px] text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 text-[13px] text-white bg-jinden-blue rounded-xl hover:bg-jinden-blue/90 disabled:opacity-40 transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
