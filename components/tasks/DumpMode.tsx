'use client';

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-key';
import { callClaude, parseJSON } from '@/lib/claude';
import { DUMP_SYSTEM_PROMPT } from '@/lib/prompts/dump-agent';
import { showToast } from '@/components/ui/Toast';
import {
  ParsedItem,
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
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = useCallback(() => {
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    });
  }, []);

  // AI parse — 3-category classification
  const handleAIParse = async () => {
    if (!rawText.trim() || loading) return;
    setLoading(true);

    try {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('APIキーが設定されていません。設定画面から登録してください。');

      const result = await callClaude({
        task: 'inboxDump',
        systemPrompt: DUMP_SYSTEM_PROMPT,
        userContent: rawText,
        apiKey,
        maxTokens: 4000,
        temperature: 0,
      });

      const parsed = parseJSON(result.text);
      if (!parsed?.items || !Array.isArray(parsed.items)) {
        throw new Error('AIの応答を解析できませんでした');
      }

      const items: ParsedItem[] = parsed.items.map((item: any) => {
        if (item.type === 'clip') {
          return {
            itemType: 'stock' as const,
            title: item.title || '無題のストック',
            url: item.url || null,
            source: item.source || null,
            tags: item.tags || [],
            memo: item.memo || null,
            project: item.project || null,
            checked: true,
          };
        } else if (item.type === 'idea') {
          return {
            itemType: 'spark' as const,
            title: item.title || '無題のひらめき',
            body: item.body || '',
            tags: item.tags || [],
            project: item.project || null,
            twin_candidate: item.twin_candidate || false,
            checked: true,
          };
        } else {
          return {
            itemType: 'task' as const,
            title: item.title || '無題のタスク',
            status: item.status || 'unsorted',
            action_type: item.action_type || 'do',
            priority: item.priority || 'medium',
            time_slot: item.time_slot || 'anytime',
            due: item.due || null,
            estimated_minutes: item.estimated_minutes || null,
            contact_persons: item.contact_persons || [],
            sub_category: item.sub_category || null,
            notes: item.notes || null,
            project: item.project || null,
            checked: true,
          };
        }
      });

      setParsedItems(items);
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

  // Bulk add from preview — handles all 3 types
  const handleBulkAdd = async () => {
    const selected = parsedItems.filter(i => i.checked);
    if (selected.length === 0) return;
    setAdding(true);

    try {
      const inserts = selected.map(item => {
        if (item.itemType === 'task') {
          return {
            user_id: userId,
            type: 'task' as const,
            title: item.title,
            status: statusFromAI(item.status),
            priority: priorityTextToInt(item.priority),
            action_type: item.action_type,
            time_slot: item.time_slot,
            due: item.due,
            estimated_minutes: item.estimated_minutes,
            contact_persons: item.contact_persons,
            sub_category: item.sub_category,
            body: item.notes,
            project: item.project,
            ai_generated: true,
          };
        } else if (item.itemType === 'stock') {
          return {
            user_id: userId,
            type: 'clip' as const,
            title: item.title,
            url: item.url,
            link_url: item.url,
            source: item.source,
            tags: item.tags,
            memo: item.memo,
            project: item.project,
            ai_generated: true,
          };
        } else {
          return {
            user_id: userId,
            type: 'idea' as const,
            title: item.title,
            body: item.body,
            tags: item.tags,
            project: item.project,
            twin_candidate: item.twin_candidate,
            ai_generated: true,
          };
        }
      });

      const { error } = await supabase.from('items').insert(inserts);
      if (error) throw error;

      showToast(`${selected.length}件追加した`, 'success');
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
    setParsedItems([]);
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

  const toggleItem = (index: number) => {
    setParsedItems(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item));
  };

  const editItemTitle = (index: number, newTitle: string) => {
    setParsedItems(prev => prev.map((item, i) => i === index ? { ...item, title: newTitle } : item));
  };

  // Change item type (task <-> stock <-> spark)
  const cycleItemType = (index: number) => {
    setParsedItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (item.itemType === 'task') {
        return {
          itemType: 'stock' as const,
          title: item.title,
          url: null,
          source: null,
          tags: [],
          memo: item.notes,
          project: item.project,
          checked: item.checked,
        };
      } else if (item.itemType === 'stock') {
        return {
          itemType: 'spark' as const,
          title: item.title,
          body: item.memo || '',
          tags: item.tags,
          project: item.project,
          twin_candidate: false,
          checked: item.checked,
        };
      } else {
        return {
          itemType: 'task' as const,
          title: item.title,
          status: 'unsorted',
          action_type: 'do' as const,
          priority: 'medium' as const,
          time_slot: 'anytime' as const,
          due: null,
          estimated_minutes: null,
          contact_persons: [],
          sub_category: null,
          notes: item.body,
          project: item.project,
          checked: item.checked,
        };
      }
    }));
  };

  const toggleTwinCandidate = (index: number) => {
    setParsedItems(prev => prev.map((item, i) => {
      if (i !== index || item.itemType !== 'spark') return item;
      return { ...item, twin_candidate: !item.twin_candidate };
    }));
  };

  if (!isOpen) return null;

  // Derived counts
  const taskItems = parsedItems.filter(i => i.itemType === 'task');
  const stockItems = parsedItems.filter(i => i.itemType === 'stock');
  const sparkItems = parsedItems.filter(i => i.itemType === 'spark');
  const selectedCount = parsedItems.filter(i => i.checked).length;

  return (
    <div className="fixed inset-0 bg-white z-[300] flex flex-col dump-fade-in">
      {screen === 'dump' ? (
        /* ===== DUMP SCREEN ===== */
        <>
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

          <div className="flex-1 overflow-y-auto px-4 pt-4">
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onPaste={handlePaste}
              placeholder={`何でも投げて。\nやること、気になった記事、思いつき、全部。\nAIが整理する。`}
              className="w-full outline-none resize-none text-gray-900 placeholder:text-gray-400 leading-relaxed"
              style={{ fontSize: 16, minHeight: '60vh' }}
              autoFocus
            />
          </div>

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
                  整理してるよ...
                </>
              ) : (
                '🤖 AIで整理する'
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

          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
            <div className="text-sm text-gray-700 mb-4">
              {parsedItems.length}件に整理しました
            </div>

            {/* === TASK SECTION === */}
            {taskItems.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
                  🔥 やること
                  <span className="text-gray-400">({taskItems.length}件)</span>
                </div>

                {/* Today tasks */}
                <TaskPreviewGroup
                  label="☀️ 今日やる"
                  items={parsedItems}
                  filter={(item) => item.itemType === 'task' && item.status === 'today'}
                  onToggle={toggleItem}
                  onEditTitle={editItemTitle}
                  onCycleType={cycleItemType}
                />

                {/* This week tasks */}
                <TaskPreviewGroup
                  label="📅 今週やる"
                  items={parsedItems}
                  filter={(item) => item.itemType === 'task' && item.status === 'this_week'}
                  onToggle={toggleItem}
                  onEditTitle={editItemTitle}
                  onCycleType={cycleItemType}
                />

                {/* Unsorted tasks grouped by action_type */}
                <UnsortedTaskGroup
                  items={parsedItems}
                  onToggle={toggleItem}
                  onEditTitle={editItemTitle}
                  onCycleType={cycleItemType}
                />
              </div>
            )}

            {/* === STOCK SECTION === */}
            {stockItems.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
                  📌 ストック
                  <span className="text-gray-400">({stockItems.length}件)</span>
                </div>
                <div className="space-y-1.5">
                  {parsedItems.map((item, index) => {
                    if (item.itemType !== 'stock') return null;
                    return (
                      <StockPreviewRow
                        key={index}
                        item={item}
                        index={index}
                        onToggle={toggleItem}
                        onEditTitle={editItemTitle}
                        onCycleType={cycleItemType}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* === SPARK SECTION === */}
            {sparkItems.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
                  💡 ひらめき
                  <span className="text-gray-400">({sparkItems.length}件)</span>
                </div>
                <div className="space-y-1.5">
                  {parsedItems.map((item, index) => {
                    if (item.itemType !== 'spark') return null;
                    return (
                      <SparkPreviewRow
                        key={index}
                        item={item}
                        index={index}
                        onToggle={toggleItem}
                        onEditTitle={editItemTitle}
                        onCycleType={cycleItemType}
                        onToggleTwin={toggleTwinCandidate}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 pb-8 z-10">
            <button
              onClick={handleBulkAdd}
              disabled={adding || selectedCount === 0}
              className="w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition flex items-center justify-center gap-2 min-h-[52px]"
              style={{ background: 'linear-gradient(135deg, #0A1628, #1565C0)' }}
            >
              {adding ? (
                <>
                  <span className="spinner w-4 h-4" />
                  追加中...
                </>
              ) : (
                `✅ ${selectedCount}件を追加する`
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ===== TASK PREVIEW SUB-COMPONENTS ===== */

function TaskPreviewGroup({
  label,
  items,
  filter,
  onToggle,
  onEditTitle,
  onCycleType,
}: {
  label: string;
  items: ParsedItem[];
  filter: (item: ParsedItem) => boolean;
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
  onCycleType: (index: number) => void;
}) {
  const filtered = items.map((item, i) => ({ item, index: i })).filter(({ item }) => filter(item));
  if (filtered.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="text-[11px] text-gray-400 mb-1.5 flex items-center gap-2">
        {label}
        <span>{filtered.length}件</span>
      </div>
      <div className="space-y-1">
        {filtered.map(({ item, index }) => (
          <TaskPreviewRow
            key={index}
            item={item as ParsedItem & { itemType: 'task' }}
            index={index}
            onToggle={onToggle}
            onEditTitle={onEditTitle}
            onCycleType={onCycleType}
          />
        ))}
      </div>
    </div>
  );
}

function UnsortedTaskGroup({
  items,
  onToggle,
  onEditTitle,
  onCycleType,
}: {
  items: ParsedItem[];
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
  onCycleType: (index: number) => void;
}) {
  const unsorted = items
    .map((item, i) => ({ item, index: i }))
    .filter(({ item }) => item.itemType === 'task' && item.status === 'unsorted');
  if (unsorted.length === 0) return null;

  const groups = ACTION_TYPE_ORDER.map(type => {
    const cfg = ACTION_TYPE_CONFIG[type];
    const entries = unsorted.filter(({ item }) => item.itemType === 'task' && item.action_type === type);
    return { type, cfg, entries };
  }).filter(g => g.entries.length > 0);

  return (
    <div className="mb-4">
      <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-2">
        📥 あとでやる
        <span>{unsorted.length}件</span>
      </div>
      {groups.map(group => (
        <div key={group.type} className="mb-3">
          <div className="text-[11px] text-gray-400 mb-1.5">
            {group.cfg.icon} {group.cfg.label} ({group.entries.length})
          </div>
          <div className="space-y-1">
            {group.entries.map(({ item, index }) => (
              <TaskPreviewRow
                key={index}
                item={item as ParsedItem & { itemType: 'task' }}
                index={index}
                onToggle={onToggle}
                onEditTitle={onEditTitle}
                onCycleType={onCycleType}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskPreviewRow({
  item,
  index,
  onToggle,
  onEditTitle,
  onCycleType,
}: {
  item: ParsedItem;
  index: number;
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
  onCycleType: (index: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);

  if (item.itemType !== 'task') return null;
  const priDot = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '';
  const actionCfg = ACTION_TYPE_CONFIG[item.action_type as ActionType] || ACTION_TYPE_CONFIG.do;

  const handleFinishEdit = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== item.title) {
      onEditTitle(index, editValue.trim());
    }
  };

  return (
    <div className={`flex items-start gap-2.5 py-2 px-2 rounded-lg transition ${item.checked ? '' : 'opacity-40'}`}>
      <button
        onClick={() => onToggle(index)}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 min-w-[20px] ${
          item.checked ? 'border-jinden-blue bg-jinden-blue' : 'border-gray-300'
        }`}
      >
        {item.checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Type icon — tap to cycle */}
      <button
        onClick={() => onCycleType(index)}
        className="text-xs mt-0.5 flex-shrink-0 min-w-[20px] hover:opacity-70"
        title="タイプを変更"
      >
        🔥
      </button>

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
              <span className="text-sm font-medium text-gray-900">{item.title}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-400">{actionCfg.icon}</span>
          {item.due && <span className="text-[11px] text-gray-400">{item.due}</span>}
          {item.estimated_minutes && (
            <span className="text-[11px] text-gray-400">
              ⏱{item.estimated_minutes >= 60 ? `${Math.floor(item.estimated_minutes / 60)}h` : `${item.estimated_minutes}m`}
            </span>
          )}
          {item.project && <span className="text-[11px] text-gray-400">{item.project}</span>}
        </div>
        {item.contact_persons.length > 0 && (
          <div className="text-[11px] mt-0.5" style={{ color: '#7C3AED' }}>
            👤 {item.contact_persons.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== STOCK PREVIEW ===== */

function StockPreviewRow({
  item,
  index,
  onToggle,
  onEditTitle,
  onCycleType,
}: {
  item: ParsedItem;
  index: number;
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
  onCycleType: (index: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);

  if (item.itemType !== 'stock') return null;

  const handleFinishEdit = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== item.title) {
      onEditTitle(index, editValue.trim());
    }
  };

  return (
    <div className={`flex items-start gap-2.5 py-2 px-2 rounded-lg transition ${item.checked ? '' : 'opacity-40'}`}>
      <button
        onClick={() => onToggle(index)}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 min-w-[20px] ${
          item.checked ? 'border-jinden-blue bg-jinden-blue' : 'border-gray-300'
        }`}
      >
        {item.checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <button
        onClick={() => onCycleType(index)}
        className="text-xs mt-0.5 flex-shrink-0 min-w-[20px] hover:opacity-70"
        title="タイプを変更"
      >
        📌
      </button>

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
            <span className="text-sm font-medium text-gray-900">{item.title}</span>
          </div>
        )}
        {item.url && (
          <div className="text-[11px] text-jinden-blue mt-0.5 truncate">
            🔗 {item.url}
          </div>
        )}
        {item.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {item.tags.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== SPARK PREVIEW ===== */

function SparkPreviewRow({
  item,
  index,
  onToggle,
  onEditTitle,
  onCycleType,
  onToggleTwin,
}: {
  item: ParsedItem;
  index: number;
  onToggle: (index: number) => void;
  onEditTitle: (index: number, title: string) => void;
  onCycleType: (index: number) => void;
  onToggleTwin: (index: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);

  if (item.itemType !== 'spark') return null;

  const handleFinishEdit = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== item.title) {
      onEditTitle(index, editValue.trim());
    }
  };

  return (
    <div className={`flex items-start gap-2.5 py-2 px-2 rounded-lg transition ${item.checked ? '' : 'opacity-40'}`}>
      <button
        onClick={() => onToggle(index)}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 min-w-[20px] ${
          item.checked ? 'border-jinden-blue bg-jinden-blue' : 'border-gray-300'
        }`}
      >
        {item.checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <button
        onClick={() => onCycleType(index)}
        className="text-xs mt-0.5 flex-shrink-0 min-w-[20px] hover:opacity-70"
        title="タイプを変更"
      >
        💡
      </button>

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
            <span className="text-sm font-medium text-gray-900">{item.title}</span>
          </div>
        )}
        {item.body && (
          <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{item.body}</div>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {item.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
              #{tag}
            </span>
          ))}
          {item.twin_candidate && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTwin(index); }}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium"
            >
              🧠 思想DB候補
            </button>
          )}
          {!item.twin_candidate && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTwin(index); }}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-500"
            >
              🧠
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
