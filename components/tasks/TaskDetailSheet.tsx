'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Item, ItemStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { ACTION_TYPE_CONFIG, ACTION_TYPE_ORDER } from '@/lib/task-config';

interface TaskDetailSheetProps {
  item: Item;
  onClose: () => void;
  onUpdate: (item: Item) => void;
  onDelete: (id: string) => void;
  onSetFocus: (id: string) => void;
}

const STATUS_PILLS: { key: ItemStatus; label: string }[] = [
  { key: 'inbox', label: '未整理' },
  { key: 'this_week', label: '今週' },
  { key: 'today', label: '★今日' },
  { key: 'in_progress', label: '進行中' },
];

const PRIORITY_PILLS = [
  { value: 3, label: '🔴高', color: '#DC2626' },
  { value: 2, label: '🟡中', color: '#D97706' },
  { value: 1, label: '⚪低', color: '#9CA3AF' },
];

const DUE_QUICK = [
  { label: '今日', status: 'today' as ItemStatus, due: '今日中' },
  { label: '今週', status: 'this_week' as ItemStatus, due: '今週中' },
  { label: '今月', status: 'inbox' as ItemStatus, due: '今月中' },
  { label: 'いつか', status: 'inbox' as ItemStatus, due: null },
];

const TIME_QUICK = [15, 30, 60, 120];

export default function TaskDetailSheet({ item, onClose, onUpdate, onDelete, onSetFocus }: TaskDetailSheetProps) {
  const [title, setTitle] = useState(item.title);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [actionType, setActionType] = useState<string>(item.action_type || 'do');
  const [priority, setPriority] = useState(item.priority);
  const [due, setDue] = useState(item.due || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(item.estimated_minutes);
  const [assignee, setAssignee] = useState(item.assignee || 'self');
  const [contactPersons, setContactPersons] = useState<string[]>(item.contact_persons || []);
  const [contactInput, setContactInput] = useState('');
  const [project, setProject] = useState(item.project || '');
  const [body, setBody] = useState(item.body || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState(item.due_date || '');
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset state when item changes
  useEffect(() => {
    setTitle(item.title);
    setStatus(item.status);
    setActionType(item.action_type || 'do');
    setPriority(item.priority);
    setDue(item.due || '');
    setEstimatedMinutes(item.estimated_minutes);
    setAssignee(item.assignee || 'self');
    setContactPersons(item.contact_persons || []);
    setProject(item.project || '');
    setBody(item.body || '');
    setDueDate(item.due_date || '');
  }, [item]);

  const saveField = useCallback(async (updates: Record<string, any>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .select()
        .single();
      if (data) {
        onUpdate(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 1000);
      }
    }, 100);
  }, [item.id, onUpdate]);

  const saveFieldImmediate = useCallback(async (updates: Record<string, any>) => {
    const { data } = await supabase
      .from('items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single();
    if (data) {
      onUpdate(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 1000);
    }
  }, [item.id, onUpdate]);

  const handleStatusChange = (s: ItemStatus) => {
    setStatus(s);
    const updates: Record<string, any> = { status: s };
    if (s === 'done') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    saveFieldImmediate(updates);
  };

  const handleActionTypeChange = (t: string) => {
    setActionType(t);
    saveFieldImmediate({ action_type: t });
  };

  const handlePriorityChange = (p: number) => {
    setPriority(p);
    saveFieldImmediate({ priority: p });
  };

  const handleDueQuick = (q: typeof DUE_QUICK[number]) => {
    setDue(q.due || '');
    setStatus(q.status);
    const updates: Record<string, any> = { due: q.due, status: q.status };
    if (q.status === 'done') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    saveFieldImmediate(updates);
  };

  const handleTimeQuick = (minutes: number) => {
    setEstimatedMinutes(minutes);
    saveFieldImmediate({ estimated_minutes: minutes });
  };

  const handleCustomTime = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      setEstimatedMinutes(num);
      saveFieldImmediate({ estimated_minutes: num });
    }
  };

  const handleAssigneeChange = (a: string) => {
    setAssignee(a);
    saveFieldImmediate({ assignee: a });
  };

  const handleAddContact = () => {
    const names = contactInput.split(/[,、，・]/).map(n => n.trim()).filter(Boolean);
    if (names.length > 0) {
      const newContacts = Array.from(new Set([...contactPersons, ...names]));
      setContactPersons(newContacts);
      setContactInput('');
      saveFieldImmediate({ contact_persons: newContacts });
    }
  };

  const handleRemoveContact = (name: string) => {
    const newContacts = contactPersons.filter(n => n !== name);
    setContactPersons(newContacts);
    saveFieldImmediate({ contact_persons: newContacts });
  };

  const handleDeleteTask = async () => {
    if (confirm('このタスクを削除しますか？')) {
      onDelete(item.id);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[199]" onClick={onClose} />

      {/* Sheet - mobile: bottom sheet, PC: right panel */}
      <div className="fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] bg-white z-[200] rounded-t-2xl md:rounded-none shadow-xl flex flex-col overflow-hidden sheet-up md:animate-slideIn" style={{ maxHeight: '85vh' }}>
        {/* Grab bar (mobile) */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 transition min-h-[44px] flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            閉じる
          </button>
          {saved && <span className="text-xs text-gray-400">保存済み ✓</span>}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title !== item.title) saveField({ title }); }}
            className="text-lg font-bold text-gray-900 outline-none w-full bg-transparent mt-4 mb-4"
            style={{ fontSize: 18 }}
            placeholder="タスク名"
          />

          {/* Status */}
          <Section label="ステータス">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_PILLS.map(s => (
                <PillButton key={s.key} label={s.label} active={status === s.key} onClick={() => handleStatusChange(s.key)} />
              ))}
            </div>
          </Section>

          {/* Action type */}
          <Section label="行動タイプ">
            <div className="flex flex-wrap gap-1.5">
              {ACTION_TYPE_ORDER.map(t => {
                const cfg = ACTION_TYPE_CONFIG[t];
                return (
                  <PillButton
                    key={t}
                    label={`${cfg.icon}${cfg.label}`}
                    active={actionType === t}
                    onClick={() => handleActionTypeChange(t)}
                    activeColor={cfg.color}
                    activeBg={cfg.bg}
                  />
                );
              })}
            </div>
          </Section>

          {/* Priority */}
          <Section label="優先度">
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_PILLS.map(p => (
                <PillButton key={p.value} label={p.label} active={priority === p.value} onClick={() => handlePriorityChange(p.value)} />
              ))}
            </div>
          </Section>

          {/* Due (quick buttons) */}
          <Section label="いつまで">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DUE_QUICK.map(q => (
                <PillButton key={q.label} label={q.label} active={due === (q.due || '')} onClick={() => handleDueQuick(q)} />
              ))}
            </div>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs text-jinden-blue hover:underline"
            >
              📅 日付を選ぶ
            </button>
            {showDatePicker && (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  saveFieldImmediate({ due_date: e.target.value || null });
                }}
                className="mt-2 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-jinden-blue"
              />
            )}
          </Section>

          {/* Estimated time */}
          <Section label="どのくらい">
            <div className="flex items-center gap-1.5">
              {TIME_QUICK.map(m => (
                <PillButton
                  key={m}
                  label={m >= 60 ? `${m / 60}h` : `${m}m`}
                  active={estimatedMinutes === m}
                  onClick={() => handleTimeQuick(m)}
                />
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="  "
                  className="w-14 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-jinden-blue text-center"
                  onBlur={(e) => handleCustomTime(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCustomTime((e.target as HTMLInputElement).value); }}
                />
                <span className="text-xs text-gray-400">分</span>
              </div>
            </div>
          </Section>

          {/* Assignee */}
          <Section label="誰が">
            <div className="flex gap-3 mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer min-h-[44px]">
                <input type="radio" name="assignee" checked={assignee === 'self'} onChange={() => handleAssigneeChange('self')} className="accent-jinden-blue" />
                <span className="text-sm">自分</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer min-h-[44px]">
                <input type="radio" name="assignee" checked={assignee === 'contact_to'} onChange={() => handleAssigneeChange('contact_to')} className="accent-jinden-blue" />
                <span className="text-sm">誰かに連絡</span>
              </label>
            </div>
            {assignee === 'contact_to' && (
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {contactPersons.map(name => (
                    <span
                      key={name}
                      className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 flex items-center gap-1"
                    >
                      {name}
                      <button onClick={() => handleRemoveContact(name)} className="text-purple-400 hover:text-purple-700">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddContact(); } }}
                    placeholder="名前をカンマ区切りで"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-jinden-blue"
                    style={{ fontSize: 16 }}
                  />
                  <button
                    onClick={handleAddContact}
                    disabled={!contactInput.trim()}
                    className="text-sm text-jinden-blue px-3 py-2 disabled:opacity-30 min-h-[44px]"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Project */}
          <Section label="プロジェクト">
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              onBlur={() => { if (project !== (item.project || '')) saveField({ project: project || null }); }}
              placeholder="プロジェクト名"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-jinden-blue"
              style={{ fontSize: 16 }}
            />
          </Section>

          {/* Notes / Body */}
          <Section label="メモ">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => { if (body !== (item.body || '')) saveField({ body: body || null }); }}
              placeholder="補足情報..."
              className="w-full text-sm border border-gray-200 rounded-lg p-3 outline-none focus:border-jinden-blue resize-none min-h-[80px]"
              style={{ fontSize: 16 }}
            />
          </Section>

          {/* Focus button */}
          <Section label="フォーカス">
            <button
              onClick={() => onSetFocus(item.id)}
              className="text-sm text-jinden-blue border border-jinden-blue/30 rounded-lg px-4 py-2.5 hover:bg-mist transition min-h-[44px]"
            >
              ☀️ 今の1つにする
            </button>
          </Section>

          {/* Delete */}
          <div className="mt-8 pt-4 border-t border-gray-100">
            <button
              onClick={handleDeleteTask}
              className="text-sm text-red-500 hover:text-red-700 transition min-h-[44px]"
            >
              🗑️ 削除する
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-medium text-gray-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

function PillButton({
  label,
  active,
  onClick,
  activeColor,
  activeBg,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
  activeBg?: string;
}) {
  const baseStyle = active
    ? {
        backgroundColor: activeBg || '#0A1628',
        color: activeColor || '#FFFFFF',
        borderColor: activeColor || '#0A1628',
      }
    : {};

  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition min-h-[32px] ${
        active
          ? 'border-current'
          : 'border-gray-200 text-gray-500 hover:border-gray-400'
      }`}
      style={baseStyle}
    >
      {label}
    </button>
  );
}
