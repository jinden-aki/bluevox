'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Item, ItemStatus, TaskItem } from '@/lib/types';
import { getApiKey } from '@/lib/api-key';
import { callClaude, parseJSON } from '@/lib/claude';
import { FOCUS_SUGGEST_PROMPT } from '@/lib/prompts/dump-agent';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import StockDetailSheet from '@/components/tasks/StockDetailSheet';
import SparkDetailSheet from '@/components/tasks/SparkDetailSheet';
import BulkInput from '@/components/tasks/BulkInput';
// V8 New Components
import TaskHeader from '@/components/tasks/TaskHeader';
import TaskTabs, { TaskTab } from '@/components/tasks/TaskTabs';
import TaskListPane from '@/components/tasks/TaskListPane';
import TaskEditModal from '@/components/tasks/TaskEditModal';
import FocusGate from '@/components/tasks/FocusGate';
import FocusCards from '@/components/tasks/FocusCards';
import QuickCapture from '@/components/tasks/QuickCapture';
import MorningDashboard from '@/components/tasks/MorningDashboard';
import BallTracker from '@/components/tasks/BallTracker';
import BallPassModal from '@/components/tasks/BallPassModal';
import BrainDumpModal from '@/components/tasks/BrainDumpModal';
import WeeklyReviewModal from '@/components/tasks/WeeklyReviewModal';
import StalePane from '@/components/tasks/StalePane';
import TrashPane from '@/components/tasks/TrashPane';
import StaleAlert from '@/components/tasks/StaleAlert';
import TagSummary from '@/components/tasks/TagSummary';
import ShortcutsOverlay from '@/components/tasks/ShortcutsOverlay';
import { getTagStyle } from '@/lib/tags';

type TopTab = 'task' | 'clip' | 'idea';

function isThisWeekStale(task: TaskItem): boolean {
  if (task.status === 'done' || task.status === 'deleted') return false;
  const updated = new Date(task.updated_at);
  return Math.floor((Date.now() - updated.getTime()) / 86400000) >= 7;
}

function isMondayAndNoReview(): boolean {
  return new Date().getDay() === 1;
}

export default function TasksPage() {
  const [items, setItems] = useState<TaskItem[]>([]);
  const [chatCounts, setChatCounts] = useState<Record<string, number>>({});
  const [topTab, setTopTab] = useState<TopTab>('task');
  const [taskTab, setTaskTab] = useState<TaskTab>('dashboard');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const [showMobileQuickAdd, setShowMobileQuickAdd] = useState(false);

  // V8 Modal states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null); // for clip/idea
  const [showFocusGate, setShowFocusGate] = useState(false);
  const [showDump, setShowDump] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [passBallTask, setPassBallTask] = useState<TaskItem | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // === Init ===
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await loadItems(user.id);
        loadChatCounts(user.id);
      }
    };
    init();
  }, []);

  // Check focus gate & weekly review after items load
  useEffect(() => {
    if (items.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const hasTodayFocus = items.some(i =>
      (i as TaskItem).is_today_focus && (i as TaskItem).focus_selected_date === today && i.status !== 'done'
    );
    if (!hasTodayFocus && items.filter(i => i.type === 'task' && i.status !== 'done').length > 0) {
      setShowFocusGate(true);
    }
    // Monday weekly review prompt
    if (isMondayAndNoReview()) {
      setTimeout(() => setShowReview(true), 1500);
    }
  }, [items.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '?': setShowShortcuts(s => !s); break;
        case 'd': case 'D': setShowDump(true); break;
        case 'Escape': setShowShortcuts(false); setShowDump(false); setShowReview(false); break;
        case '1': setTaskTab('dashboard'); break;
        case '2': setTaskTab('list'); break;
        case '3': setTaskTab('ball'); break;
        case '4': setTaskTab('kanban'); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // === Data Loading ===
  const loadItems = async (uid: string) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', uid)
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (data) setItems(data as TaskItem[]);
  };

  const loadChatCounts = async (uid: string) => {
    const { data } = await supabase.from('item_chats').select('item_id').eq('user_id', uid);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((c: any) => { counts[c.item_id] = (counts[c.item_id] || 0) + 1; });
      setChatCounts(counts);
    }
  };

  const reloadItems = useCallback(async () => {
    if (userId) await loadItems(userId);
  }, [userId]);

  // === Mutations ===
  const handleComplete = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStatus = item.status === 'done' ? 'inbox' : 'done';
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    };
    const { data } = await supabase.from('items').update(updates).eq('id', id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === id ? data as TaskItem : i));
  }, [items]);

  const handleStatusChange = useCallback(async (id: string, status: ItemStatus) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'done') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    const { data } = await supabase.from('items').update(updates).eq('id', id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === id ? data as TaskItem : i));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // Soft delete: move to 'deleted' status
    const { data } = await supabase
      .from('items')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data) {
      setItems(prev => prev.map(i => i.id === id ? data as TaskItem : i));
      setSelectedTask(null);
    }
  }, []);

  const handleHardDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleTaskSave = useCallback((updated: TaskItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedTask(updated);
  }, []);

  const handleItemUpdate = useCallback((updated: Item) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated as TaskItem : i));
    setSelectedItem(updated);
  }, []);

  const handleRestoreTask = useCallback((updated: TaskItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  }, []);

  const handleFocusGateComplete = useCallback(async (selectedIds: string[]) => {
    setShowFocusGate(false);
    await reloadItems();
    setTaskTab('list');
    showToast(`⭐ ${selectedIds.length}つのフォーカスを設定しました`, 'success');
  }, [reloadItems]);

  const handleAdded = useCallback((newTasks: TaskItem[]) => {
    setItems(prev => [...newTasks, ...prev]);
  }, []);

  const handleBulkAdd = useCallback(async (bulkItems: { title: string; tags: string[] }[]) => {
    if (!userId) return;
    const inserts = bulkItems.map(bi => ({
      user_id: userId,
      type: (bi.tags.includes('アイデア') ? 'idea' : 'task') as 'task' | 'idea',
      title: bi.title,
      tags: bi.tags,
    }));
    const { data, error } = await supabase.from('items').insert(inserts).select();
    if (error) { showToast('追加に失敗しました', 'error'); return; }
    if (data) {
      setItems(prev => [...(data as TaskItem[]), ...prev]);
      showToast(`${data.length}件追加しました`, 'success');
    }
  }, [userId]);

  const _handleQuickAdd = useCallback(async (title: string, tags: string[]) => {
    if (!userId) return;
    let itemType: 'task' | 'clip' | 'idea' = 'task';
    let cleanTitle = title;
    if (title.startsWith('📌')) { itemType = 'clip'; cleanTitle = title.replace(/^📌\s*/, ''); }
    else if (title.startsWith('💡')) { itemType = 'idea'; cleanTitle = title.replace(/^💡\s*/, ''); }
    if (tags.includes('アイデア')) itemType = 'idea';

    const { data, error } = await supabase
      .from('items')
      .insert({ user_id: userId, type: itemType, title: cleanTitle, tags })
      .select()
      .single();
    if (error) { showToast('追加に失敗しました', 'error'); return; }
    if (data) { setItems(prev => [data as TaskItem, ...prev]); showToast('追加しました', 'success'); }
  }, [userId]);

  const handleConvertToTask = useCallback(async (item: Item) => {
    const taskTitle = item.title.endsWith('する') ? item.title : `${item.title}を実行する`;
    const { data } = await supabase
      .from('items')
      .update({ type: 'task', title: taskTitle, status: 'inbox', action_type: 'do', updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single();
    if (data) {
      setItems(prev => prev.map(i => i.id === item.id ? data as TaskItem : i));
      setSelectedItem(null);
      setTopTab('task');
      showToast('🔥 タスクに変換しました', 'success');
    }
  }, []);

  const _handleAISuggest = useCallback(async () => {
    if (!userId) return;
    try {
      const apiKey = await getApiKey();
      if (!apiKey) { showToast('APIキーが設定されていません', 'error'); return; }
      const taskItems = items.filter(i => i.type === 'task' && i.status !== 'done' && i.status !== 'deleted');
      if (taskItems.length === 0) { showToast('タスクがありません', 'info'); return; }
      const now = new Date();
      const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      const dayOfWeek = days[now.getDay()];
      const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      const taskJSON = JSON.stringify(taskItems.map(i => ({
        id: i.id, title: i.title, status: i.status,
        action_type: i.action_type || 'do', priority: i.priority,
        due: i.due, estimated_minutes: i.estimated_minutes, project: i.project,
      })));
      const result = await callClaude({
        task: 'taskFocus',
        systemPrompt: 'あなたはタスク選定のアドバイザーです。指示に従いJSONで回答してください。',
        userContent: FOCUS_SUGGEST_PROMPT(dayOfWeek, currentTime, taskJSON),
        apiKey, maxTokens: 1000, temperature: 0,
      });
      const parsed = parseJSON(result.text);
      if (!parsed?.focus || !Array.isArray(parsed.focus)) throw new Error('AI応答の解析に失敗');
      // Clear existing today focus
      const today = new Date().toISOString().slice(0, 10);
      const currentFocus = items.filter(i => (i as TaskItem).is_today_focus);
      for (const fi of currentFocus) {
        await supabase.from('items').update({ is_today_focus: false }).eq('id', fi.id);
      }
      for (let i = 0; i < Math.min(parsed.focus.length, 3); i++) {
        const f = parsed.focus[i];
        await supabase.from('items').update({
          is_today_focus: true, focus_selected_date: today, is_focus: true, focus_order: i + 1, status: 'today',
        }).eq('id', f.task_id);
      }
      await reloadItems();
      showToast('🤖 今日の3つを選びました', 'success');
    } catch {
      showToast('AI提案に失敗しました', 'error');
    }
  }, [items, userId, reloadItems]);

  // === Derived Data ===
  const taskItems = items.filter(i => i.type === 'task');
  const clipItems = items.filter(i => i.type === 'clip');
  const ideaItems = items.filter(i => i.type === 'idea');

  const today = new Date().toISOString().slice(0, 10);
  const todayFocusTasks = taskItems.filter(i =>
    (i as TaskItem).is_today_focus && (i as TaskItem).focus_selected_date === today && i.status !== 'done'
  );
  const otherBallTasks = taskItems.filter(i =>
    (i as TaskItem).ball_holder === 'other' && i.status !== 'done' && i.status !== 'deleted'
  );
  const staleTasks = taskItems.filter(isThisWeekStale);
  const activeTasks = taskItems.filter(i => i.status !== 'deleted');

  const taskCount = taskItems.filter(i => i.status !== 'done' && i.status !== 'deleted').length;

  const filteredClips = clipItems.filter(i => {
    if (tagFilter && !i.tags.includes(tagFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return i.title.toLowerCase().includes(q) || (i.memo || '').toLowerCase().includes(q)
        || i.tags.some(t => t.toLowerCase().includes(q)) || (i.url || i.link_url || '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredIdeas = ideaItems.filter(i => {
    if (tagFilter && !i.tags.includes(tagFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return i.title.toLowerCase().includes(q) || (i.body || '').toLowerCase().includes(q)
        || i.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  // List tab: filter by status tabs
  const listStatusFilter = ['inbox', 'this_week', 'today', 'in_progress'];
  const filteredListTasks = activeTasks.filter(i =>
    listStatusFilter.includes(i.status) &&
    (!tagFilter || i.tags.includes(tagFilter)) &&
    (!searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-paper">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 flex flex-col min-h-screen">

          {/* Mobile fixed top header */}
          <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-4 z-40">
            <span className="text-sm font-semibold text-ink">BLUEVOX</span>
            <button
              onClick={() => setShowDump(true)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* ===== TOP TAB BAR (desktop only) ===== */}
          <div className="hidden md:block sticky top-0 z-40 bg-white border-b border-gray-100">
            <div className="flex items-center gap-1 px-4 pt-3 pb-0">
              {([
                { key: 'task' as TopTab, label: '🔥 やること', count: taskCount },
                { key: 'clip' as TopTab, label: '📌 ストック', count: clipItems.length },
                { key: 'idea' as TopTab, label: '💡 ひらめき', count: ideaItems.length },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTopTab(t.key); setTagFilter(null); setSearchQuery(''); }}
                  className={`pb-2.5 px-2 text-[13px] font-medium border-b-2 transition-colors ${
                    topTab === t.key
                      ? 'border-jinden-blue text-jinden-blue'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                  <span className="ml-1 text-[11px] opacity-60">({t.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== TASK TAB ===== */}
          {topTab === 'task' && (
            <div className="flex flex-col flex-1 min-h-0 pt-12 md:pt-0">
              {/* Task header (desktop only) */}
              <div className="hidden md:block">
                <TaskHeader onOpenDump={() => setShowDump(true)} onOpenReview={() => setShowReview(true)} />
              </div>

              {/* QuickCapture */}
              {userId && (
                <QuickCapture
                  userId={userId}
                  onAdded={handleAdded}
                  mobileOpen={showMobileQuickAdd}
                  onMobileClose={() => setShowMobileQuickAdd(false)}
                />
              )}

              {/* Stale alert (desktop only) */}
              {staleTasks.length > 0 && (
                <div className="hidden md:block">
                  <StaleAlert count={staleTasks.length} onClick={() => setTaskTab('stale')} />
                </div>
              )}

              {/* Focus Cards (desktop only) */}
              {todayFocusTasks.length > 0 && taskTab !== 'dashboard' && (
                <div className="hidden md:block">
                  <FocusCards
                    tasks={todayFocusTasks}
                    onComplete={handleComplete}
                    onSelect={t => setSelectedTask(t)}
                  />
                </div>
              )}

              {/* Task sub-tabs (desktop only — mobile uses bottom nav) */}
              <TaskTabs
                activeTab={taskTab}
                onChange={setTaskTab}
                ballCount={otherBallTasks.length}
                staleCount={staleTasks.length}
              />

              {/* Tag filter (list tab) */}
              {taskTab === 'list' && (
                <TagSummary
                  tasks={activeTasks}
                  activeTag={tagFilter}
                  onTagClick={setTagFilter}
                />
              )}

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {taskTab === 'dashboard' && (
                  <MorningDashboard
                    tasks={activeTasks}
                    todayFocusTasks={todayFocusTasks}
                    otherBallTasks={otherBallTasks}
                    onShowList={() => setTaskTab('list')}
                    onAddTask={() => setShowDump(true)}
                    onSelectTask={t => setSelectedTask(t)}
                    onComplete={handleComplete}
                  />
                )}

                {taskTab === 'list' && (
                  <TaskListPane
                    tasks={filteredListTasks}
                    onComplete={handleComplete}
                    onSelect={t => setSelectedTask(t)}
                    onPassBall={t => setPassBallTask(t)}
                    onDelete={handleDelete}
                    emptyMessage="タスクがありません。QuickCaptureから追加しましょう"
                  />
                )}

                {taskTab === 'ball' && (
                  <BallTracker
                    tasks={activeTasks}
                    onSelect={t => setSelectedTask(t)}
                    onPassBall={t => setPassBallTask(t)}
                  />
                )}

                {taskTab === 'kanban' && (
                  <KanbanBoard
                    items={activeTasks as unknown as Item[]}
                    chatCounts={chatCounts}
                    onStatusChange={handleStatusChange}
                    onCardClick={item => setSelectedTask(item as unknown as TaskItem)}
                  />
                )}

                {taskTab === 'stale' && (
                  <StalePane
                    tasks={activeTasks}
                    onComplete={handleComplete}
                    onSelect={t => setSelectedTask(t)}
                    onPassBall={t => setPassBallTask(t)}
                  />
                )}

                {taskTab === 'trash' && (
                  <TrashPane
                    tasks={items}
                    onRestore={handleRestoreTask}
                    onHardDelete={handleHardDelete}
                  />
                )}
              </div>
            </div>
          )}

          {/* ===== CLIP TAB ===== */}
          {topTab === 'clip' && (
            <div className="flex flex-col flex-1">
              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ストックを検索..."
                  className="w-full text-[16px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-jinden-blue"
                />
              </div>

              {/* Tag filter */}
              <TagSummary
                tasks={clipItems as unknown as TaskItem[]}
                activeTag={tagFilter}
                onTagClick={setTagFilter}
              />

              {/* Clip list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredClips.length === 0 ? (
                  <div className="text-center text-gray-400 py-16">
                    <div className="text-4xl mb-2">📌</div>
                    <p className="text-[14px]">ストックはありません</p>
                  </div>
                ) : (
                  filteredClips.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="bg-white rounded-xl border border-gray-100 p-3 cursor-pointer hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {item.link_thumbnail && (
                          <img src={item.link_thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-ink line-clamp-2">{item.title}</p>
                          {item.url && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.url}</p>}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.map(t => (
                              <span key={t} className="text-[11px] px-1.5 py-0.5 rounded-full" style={getTagStyle(t)}>#{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ===== IDEA TAB ===== */}
          {topTab === 'idea' && (
            <div className="flex flex-col flex-1">
              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ひらめきを検索..."
                  className="w-full text-[16px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-jinden-blue"
                />
              </div>

              {/* Tag filter */}
              <TagSummary
                tasks={ideaItems as unknown as TaskItem[]}
                activeTag={tagFilter}
                onTagClick={setTagFilter}
              />

              {/* Idea list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredIdeas.length === 0 ? (
                  <div className="text-center text-gray-400 py-16">
                    <div className="text-4xl mb-2">💡</div>
                    <p className="text-[14px]">ひらめきはありません</p>
                  </div>
                ) : (
                  filteredIdeas.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="bg-white rounded-xl border border-gray-100 p-3 cursor-pointer hover:border-gray-200 transition-colors"
                    >
                      <p className="text-[14px] text-ink">{item.title}</p>
                      {item.body && <p className="text-[12px] text-gray-500 mt-1 line-clamp-2">{item.body}</p>}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.tags.map(t => (
                          <span key={t} className="text-[11px] px-1.5 py-0.5 rounded-full" style={getTagStyle(t)}>#{t}</span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Mobile bottom tab bar */}
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 flex items-center justify-around py-2 z-40"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            <MobileTabButton icon="🌅" label="ホーム" active={taskTab === 'dashboard' && topTab === 'task'} onClick={() => { setTopTab('task'); setTaskTab('dashboard'); }} />
            <MobileTabButton icon="📋" label="タスク" active={taskTab === 'list' && topTab === 'task'} onClick={() => { setTopTab('task'); setTaskTab('list'); }} />
            <button
              onClick={() => setShowMobileQuickAdd(true)}
              className="w-12 h-12 bg-jinden-blue text-white rounded-full flex items-center justify-center text-xl shadow-lg -mt-4"
            >
              ➕
            </button>
            <MobileTabButton icon="🏀" label="ボール" active={taskTab === 'ball' && topTab === 'task'} onClick={() => { setTopTab('task'); setTaskTab('ball'); }} />
            <MobileTabButton icon="🗂️" label="カンバン" active={taskTab === 'kanban' && topTab === 'task'} onClick={() => { setTopTab('task'); setTaskTab('kanban'); }} />
          </div>

          {/* Shortcuts hint */}
          <div className="hidden md:flex items-center justify-end px-4 py-2 border-t border-gray-100 bg-white">
            <button
              onClick={() => setShowShortcuts(true)}
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              ⌨️ ?でショートカット表示
            </button>
          </div>
        </main>
      </div>

      {/* ===== MODALS ===== */}

      {/* Focus Gate */}
      {showFocusGate && (
        <FocusGate
          tasks={taskItems}
          onComplete={handleFocusGateComplete}
          onSkip={() => setShowFocusGate(false)}
        />
      )}

      {/* Task Edit Modal (V8) */}
      {selectedTask && topTab === 'task' && (
        <TaskEditModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleTaskSave}
          onDelete={handleDelete}
        />
      )}

      {/* Clip Detail Sheet */}
      {selectedItem && selectedItem.type === 'clip' && (
        <StockDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
          onDelete={async (id) => {
            await supabase.from('items').delete().eq('id', id);
            setItems(prev => prev.filter(i => i.id !== id));
            setSelectedItem(null);
          }}
          onConvertToTask={handleConvertToTask}
        />
      )}

      {/* Idea Detail Sheet */}
      {selectedItem && selectedItem.type === 'idea' && (
        <SparkDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
          onDelete={async (id) => {
            await supabase.from('items').delete().eq('id', id);
            setItems(prev => prev.filter(i => i.id !== id));
            setSelectedItem(null);
          }}
          onConvertToTask={handleConvertToTask}
        />
      )}

      {/* Brain Dump */}
      {showDump && userId && (
        <BrainDumpModal
          userId={userId}
          onClose={() => setShowDump(false)}
          onTasksCreated={async () => {
            await reloadItems();
            setShowDump(false);
          }}
        />
      )}

      {/* Weekly Review */}
      {showReview && userId && (
        <WeeklyReviewModal
          items={taskItems}
          userId={userId}
          onClose={() => setShowReview(false)}
        />
      )}

      {/* Ball Pass */}
      {passBallTask && (
        <BallPassModal
          task={passBallTask}
          onClose={() => setPassBallTask(null)}
          onSave={updated => {
            setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
            setPassBallTask(null);
          }}
        />
      )}

      {/* Shortcuts */}
      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}

      {/* Bulk Input (legacy) */}
      {showBulk && (
        <BulkInput
          isOpen={showBulk}
          onClose={() => setShowBulk(false)}
          onSubmit={handleBulkAdd}
        />
      )}

      <ToastContainer />
    </AuthGuard>
  );
}

function MobileTabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] min-h-[44px] justify-center transition-colors ${
        active ? 'text-jinden-blue' : 'text-gray-400'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
