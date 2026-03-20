'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-key';
import { callClaude, parseJSON } from '@/lib/claude';
import { DUMP_SYSTEM_PROMPT } from '@/lib/prompts/dump-agent';
import { showToast } from '@/components/ui/Toast';
import {
  ParsedTask,
  ACTION_TYPE_CONFIG,
  ACTION_TYPE_ORDER,
  ActionType,
  priorityTextToInt,
  statusFromAI,
} from '@/lib/task-config';

interface DumpModeProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCreated: () => void;
  userId: string;
}

export default function DumpMode({ isOpen, onClose, onTasksCreated, userId }: DumpModeProps) {
  const [screen, setScreen] = useState<'dump' | 'preview'>('dump');
  const [rawText, setRawText] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea on paste
  const handlePaste = useCallback(() => {
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    });
  }, []);

  // AI parse
  const handleAIParse = async () => {
    if (!rawText.trim() || loading) return;
    setLoading(true);

    try {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('APIキーが設定されていません。設定画面から登録してください。');

      const result = await callClaude({
        task: 'taskDump',
        systemPrompt: DUMP_SYSTEM_PROMPT,
        userContent: rawText,
        apiKey,
        maxTokens: 4000,
        temperature: 0,
      });

      const parsed = parseJSON(result.text);
      if (!parsed?.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('AIの応答を解析できませんでした');
      }

      const tasks: ParsedTask[] = parsed.tasks.map((t: any) => ({
        title: t.title || '無題のタスク',
        status: t.status || 'unsorted',
        action_type: t.action_type || 'do',
        priority: t.priority || 'medium',
        time_slot: t.time_slot || 'anytime',
        due: t.due || null,
        estimated_minutes: t.estimated_minutes || null,
        contact_persons: t.contact_persons || [],
        sub_category: t.sub_category || null,
        notes: t.notes || null,
        project: t.project || null,
        checked: true,
      }));

      setParsedTasks(tasks);
      setScreen('preview');
    } catch (err: any) {
      console.error('AI parse error:', err);
      showToast(err.message || 'AI解析に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add single task directly
  const handleDirectAdd = async () => {
    if (!rawText.trim() || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('items').insert({
        user_id: userId,
        type: 'task',
        title: rawText.trim(),
      });
      if (error) throw error;
      showToast('追加しました', 'success');
      handleReset();
      onTasksCreated();
      onClose();
    } catch {
      showToast('追加に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk add from preview
  const handleBulkAdd = async () => {
    const selected = parsedTasks.filter(t => t.checked);
    if (selected.length === 0) return;
    setAdding(true);

    try {
      const inserts = selected.map(t => ({
        user_id: userId,
        type: 'task',
        title: t.title,
        status: statusFromAI(t.status),
        priority: priorityTextToInt(t.priority),
        action_type: t.action_type,
        time_slot: t.time_slot,
        due: t.due,
        estimated_minutes: t.estimated_minutes,
        contact_persons: t.contact_persons,
        sub_category: t.sub_category,
        body: t.notes,
        project: t.project,
        ai_generated: true,
      }));

      const { error } = await supabase.from('items').insert(inserts);
      if (error) throw error;

      showToast(`✅ ${selected.length}件追加した`, 'success');
      handleReset();
      onTasksCreated();
      onClose();
    } catch (err: any) {
      console.error('Bulk add error:', err);
      showToast('追加に失敗しました', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleReset = () => {
    setRawText('');
    setParsedTasks([]);
    setScreen('dump');
  };

  const handleBack = () => {
    if (screen === 'preview') {
      setScreen('dump');
    } else {
      handleReset();
      onClose();
    }
  };

  // Toggle task check in preview
  const toggleTask = (index: number) => {
    setParsedTasks(prev => prev.map((t, i) => i === index ? { ...t, checked: !t.checked } : t));
  };

  // Edit task title in preview
  const editTaskTitle = (index: number, newTitle: string) => {
    setParsedTasks(prev => prev.map((t, i) => i === index ? { ...t, title: newTitle } : t));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[300] flex flex-col dump-fade-in">
      {screen === 'dump' ? (
        /* ===== DUMP SCREEN ===== */
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-800 transition min-h-[44px] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <span className="text-sm font-medium text-gray-900">脳内を吐き出す</span>
            <div className="w-12" />
          </div>

          {/* Textarea */}
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onPaste={handlePaste}
              placeholder={`ここに全部書き出して。\n箇条書きでもメモでも\nLINEのコピペでも何でもOK。\nAIが全部整理する。`}
              className="w-full outline-none resize-none text-gray-900 placeholder:text-gray-400 leading-relaxed"
              style={{ fontSize: 16, minHeight: '60vh' }}
              autoFocus
            />
          </div>

          {/* Bottom actions */}
          <div className="px-4 pb-8 pt-4 flex-shrink-0 space-y-3">
            <button
              onClick={handleAIParse}
              disabled={!rawText.trim() || loading}
              className="w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition flex items-center justify-center gap-2 min-h-[52px]"
              style={{ background: 'linear-gradient(135deg, #0A1628, #1565C0)' }}
            >
              {loading ? (
                <>
                  <span className="spinner w-4 h-4" />
                  🤖 整理してるよ...
                </>
              ) : (
                '🤖 AIで分解する'
              )}
            </button>
            <button
              onClick={handleDirectAdd}
              disabled={!rawText.trim() || loading}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition py-2 disabled:opacity-30"
            >
              1件のタスクとしてそのまま追加
            </button>
          </div>
        </>
      ) : (
        /* ===== PREVIEW SCREEN ===== */
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-800 transition min-h-[44px] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              修正
            </button>
            <span className="text-sm font-medium text-gray-900">整理できたよ</span>
            <button
              onClick={handleBulkAdd}
              disabled={adding}
              className="text-sm text-jinden-blue font-medium min-h-[44px] flex items-center"
            >
              完了
            </button>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
            <div className="text-sm text-gray-700 mb-4">
              {parsedTasks.length}件のタスクに分解しました
            </div>

            <PreviewSection
              label="☀️ 今日やる"
              filter={(t) => t.status === 'today'}
              onToggle={toggleTask}
              onEditTitle={editTaskTitle}
              allTasks={parsedTasks}
            />

            <PreviewSection
              label="📅 今週やる"
              filter={(t) => t.status === 'this_week'}
              onToggle={toggleTask}
              onEditTitle={editTaskTitle}
              allTasks={parsedTasks}
            />

            <PreviewUnsortedSection
              tasks={parsedTasks}
              onToggle={toggleTask}
              onEditTitle={editTaskTitle}
            />
          </div>

          {/* Bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 pb-8 z-10">
            <button
              onClick={handleBulkAdd}
              disabled={adding || parsedTasks.filter(t => t.checked).length === 0}
              className="w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition flex items-center justify-center gap-2 min-h-[52px]"
              style={{ background: 'linear-gradient(135deg, #0A1628, #1565C0)' }}
            >
              {adding ? (
                <>
                  <span className="spinner w-4 h-4" />
                  追加中...
                </>
              ) : (
                `✅ ${parsedTasks.filter(t => t.checked).length}件を追加する`
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ===== PREVIEW SUB-COMPONENTS ===== */

function PreviewSection({
  label,
  filter,
  onToggle,
  onEditTitle,
  allTasks,
}: {
  label: string;
  filter: (t: ParsedTask) => boolean;
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
  allTasks: ParsedTask[];
}) {
  const filtered = allTasks.map((t, i) => ({ task: t, index: i })).filter(({ task }) => filter(task));
  if (filtered.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2">
        {label}
        <span className="text-gray-400">{filtered.length}件</span>
      </div>
      <div className="space-y-1">
        {filtered.map(({ task, index }) => (
          <PreviewTaskRow key={index} task={task} index={index} onToggle={onToggle} onEditTitle={onEditTitle} />
        ))}
      </div>
    </div>
  );
}

function PreviewUnsortedSection({
  tasks,
  onToggle,
  onEditTitle,
}: {
  tasks: ParsedTask[];
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
}) {
  const unsorted = tasks.map((t, i) => ({ task: t, index: i })).filter(({ task }) => task.status === 'unsorted');
  if (unsorted.length === 0) return null;

  // Group by action_type
  const groups = ACTION_TYPE_ORDER.map(type => {
    const cfg = ACTION_TYPE_CONFIG[type];
    const items = unsorted.filter(({ task }) => task.action_type === type);
    return { type, cfg, items };
  }).filter(g => g.items.length > 0);

  return (
    <div className="mb-5">
      <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
        📥 あとでやる
        <span className="text-gray-400">{unsorted.length}件</span>
      </div>
      {groups.map(group => (
        <div key={group.type} className="mb-3">
          <div className="text-[11px] text-gray-400 mb-1.5">
            {group.cfg.icon} {group.cfg.label} ({group.items.length})
          </div>
          <div className="space-y-1">
            {group.items.map(({ task, index }) => (
              <PreviewTaskRow key={index} task={task} index={index} onToggle={onToggle} onEditTitle={onEditTitle} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewTaskRow({
  task,
  index,
  onToggle,
  onEditTitle,
}: {
  task: ParsedTask;
  index: number;
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);

  const priDot = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '';
  const actionCfg = ACTION_TYPE_CONFIG[task.action_type as ActionType] || ACTION_TYPE_CONFIG.do;

  const handleFinishEdit = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== task.title) {
      onEditTitle(index, editValue.trim());
    }
  };

  return (
    <div className={`flex items-start gap-2.5 py-2 px-2 rounded-lg transition ${task.checked ? '' : 'opacity-40'}`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(index)}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 min-w-[20px] ${
          task.checked ? 'border-jinden-blue bg-jinden-blue' : 'border-gray-300'
        }`}
      >
        {task.checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFinishEdit(); }}
            className="w-full text-sm outline-none border-b border-jinden-blue bg-transparent"
            style={{ fontSize: 16 }}
            autoFocus
          />
        ) : (
          <div onClick={() => setEditing(true)} className="cursor-text">
            <div className="flex items-center gap-1">
              {priDot && <span className="text-[10px]">{priDot}</span>}
              <span className="text-sm font-medium text-gray-900">{task.title}</span>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-400">{actionCfg.icon}</span>
          {task.due && <span className="text-[11px] text-gray-400">{task.due}</span>}
          {task.estimated_minutes && (
            <span className="text-[11px] text-gray-400">
              ⏱{task.estimated_minutes >= 60 ? `${Math.floor(task.estimated_minutes / 60)}h` : `${task.estimated_minutes}m`}
            </span>
          )}
          {task.project && <span className="text-[11px] text-gray-400">{task.project}</span>}
        </div>

        {/* Contact persons */}
        {task.contact_persons.length > 0 && (
          <div className="text-[11px] mt-0.5" style={{ color: '#7C3AED' }}>
            👤 {task.contact_persons.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
