'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Item, ItemStatus } from '@/lib/types';
import { getApiKey } from '@/lib/api-key';
import { callClaude, parseJSON } from '@/lib/claude';
import { FOCUS_SUGGEST_PROMPT } from '@/lib/prompts/dump-agent';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import QuickInput from '@/components/tasks/QuickInput';
import BulkInput from '@/components/tasks/BulkInput';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskDetail from '@/components/tasks/TaskDetail';
import FocusView from '@/components/tasks/FocusView';
import AllTasksView from '@/components/tasks/AllTasksView';
import CompletedView from '@/components/tasks/CompletedView';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';
import DumpMode from '@/components/tasks/DumpMode';
import { getTagStyle } from '@/lib/tags';

type TopTab = 'task' | 'clip' | 'idea';
type SubTab = 'focus' | 'all' | 'done' | 'kanban';

export default function TasksPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [chatCounts, setChatCounts] = useState<Record<string, number>>({});
  const [topTab, setTopTab] = useState<TopTab>('task');
  const [subTab, setSubTab] = useState<SubTab>('focus');
  const [showBulk, setShowBulk] = useState(false);
  const [showDump, setShowDump] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Init
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadItems(user.id);
        loadChatCounts(user.id);
      }
    };
    init();
    scheduleNotifications();
  }, []);

  const loadItems = async (uid: string) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', uid)
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  const loadChatCounts = async (uid: string) => {
    const { data } = await supabase
      .from('item_chats')
      .select('item_id')
      .eq('user_id', uid);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((c: any) => {
        counts[c.item_id] = (counts[c.item_id] || 0) + 1;
      });
      setChatCounts(counts);
    }
  };

  // Reload items
  const reloadItems = useCallback(async () => {
    if (userId) await loadItems(userId);
  }, [userId]);

  // Quick add
  const handleQuickAdd = useCallback(async (title: string, tags: string[]) => {
    if (!userId) return;

    const urlMatch = title.match(/(https?:\/\/[^\s]+)/);
    let itemType: 'task' | 'clip' | 'idea' = 'task';
    let linkUrl = null;
    let linkTitle = null;
    let linkThumbnail = null;

    if (urlMatch) {
      itemType = 'clip';
      linkUrl = urlMatch[1];
      try {
        const ogpRes = await fetch(`/api/ogp?url=${encodeURIComponent(linkUrl)}`);
        const ogp = await ogpRes.json();
        if (ogp.title) linkTitle = ogp.title;
        if (ogp.image) linkThumbnail = ogp.image;
      } catch {}
    }

    if (tags.includes('アイデア')) itemType = 'idea';

    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: userId,
        type: itemType,
        title: linkTitle || title,
        tags,
        link_url: linkUrl,
        link_title: linkTitle,
        link_thumbnail: linkThumbnail,
      })
      .select()
      .single();

    if (error) {
      showToast('追加に失敗しました', 'error');
    } else if (data) {
      setItems(prev => [data, ...prev]);
      showToast('追加しました', 'success');
    }
  }, [userId]);

  // Bulk add
  const handleBulkAdd = useCallback(async (bulkItems: { title: string; tags: string[] }[]) => {
    if (!userId) return;

    const inserts = bulkItems.map(bi => ({
      user_id: userId,
      type: bi.tags.includes('アイデア') ? 'idea' : 'task' as const,
      title: bi.title,
      tags: bi.tags,
    }));

    const { data, error } = await supabase
      .from('items')
      .insert(inserts)
      .select();

    if (error) {
      showToast('追加に失敗しました', 'error');
    } else if (data) {
      setItems(prev => [...data, ...prev]);
      showToast(`${data.length}件追加しました`, 'success');
    }
  }, [userId]);

  // Image paste
  const handleImagePaste = useCallback(async (file: File) => {
    if (!userId) return;

    let imageUrl: string;
    if (file.size < 500 * 1024) {
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } else {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('items')
        .upload(fileName, file);
      if (uploadError) {
        showToast('画像のアップロードに失敗しました', 'error');
        return;
      }
      const { data: urlData } = supabase.storage.from('items').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: userId,
        type: 'clip',
        title: 'スクリーンショット',
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) {
      showToast('保存に失敗しました', 'error');
    } else if (data) {
      setItems(prev => [data, ...prev]);
      showToast('画像を保存しました', 'success');
    }
  }, [userId]);

  // Status change
  const handleStatusChange = useCallback(async (id: string, status: ItemStatus) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'done') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;

    const { data } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (data) {
      setItems(prev => prev.map(i => i.id === id ? data : i));
    }
  }, []);

  // Complete task (from hero card)
  const handleComplete = useCallback(async (id: string) => {
    await handleStatusChange(id, 'done');
  }, [handleStatusChange]);

  // Toggle complete
  const handleToggleComplete = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStatus = item.status === 'done' ? 'inbox' : 'done';
    await handleStatusChange(id, newStatus);
  }, [items, handleStatusChange]);

  // Delete
  const handleDelete = useCallback(async (id: string) => {
    await supabase.from('items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedItem(null);
  }, []);

  // Update item
  const handleItemUpdate = useCallback((updated: Item) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
  }, []);

  // Set focus
  const handleSetFocus = useCallback(async (id: string) => {
    // Clear existing focus items
    const currentFocus = items.filter(i => i.is_focus);
    for (const fi of currentFocus) {
      await supabase.from('items').update({ is_focus: false, focus_order: 0 }).eq('id', fi.id);
    }
    // Set new focus
    await supabase.from('items').update({ is_focus: true, focus_order: 1, status: 'today' }).eq('id', id);
    await reloadItems();
    setSelectedItem(null);
    setSubTab('focus');
    showToast('☀️ フォーカスに設定しました', 'success');
  }, [items, reloadItems]);

  // AI suggest focus
  const handleAISuggest = useCallback(async () => {
    if (!userId) return;
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        showToast('APIキーが設定されていません', 'error');
        return;
      }

      const taskItems = items.filter(i => i.type === 'task' && i.status !== 'done');
      if (taskItems.length === 0) {
        showToast('タスクがありません', 'info');
        return;
      }

      const now = new Date();
      const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      const dayOfWeek = days[now.getDay()];
      const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

      const taskJSON = JSON.stringify(taskItems.map(i => ({
        id: i.id,
        title: i.title,
        status: i.status,
        action_type: i.action_type || 'do',
        priority: i.priority,
        due: i.due,
        estimated_minutes: i.estimated_minutes,
        project: i.project,
      })));

      const result = await callClaude({
        task: 'taskFocus',
        systemPrompt: 'あなたはタスク選定のアドバイザーです。指示に従いJSONで回答してください。',
        userContent: FOCUS_SUGGEST_PROMPT(dayOfWeek, currentTime, taskJSON),
        apiKey,
        maxTokens: 1000,
        temperature: 0,
      });

      const parsed = parseJSON(result.text);
      if (!parsed?.focus || !Array.isArray(parsed.focus)) {
        throw new Error('AI応答の解析に失敗');
      }

      // Clear existing focus
      const currentFocus = items.filter(i => i.is_focus);
      for (const fi of currentFocus) {
        await supabase.from('items').update({ is_focus: false, focus_order: 0 }).eq('id', fi.id);
      }

      // Set new focus items
      for (let i = 0; i < Math.min(parsed.focus.length, 3); i++) {
        const f = parsed.focus[i];
        await supabase.from('items').update({
          is_focus: true,
          focus_order: i + 1,
          status: 'today',
        }).eq('id', f.task_id);
      }

      await reloadItems();
      setSubTab('focus');
      showToast('🤖 今日の3つを選びました', 'success');
    } catch (err: any) {
      console.error('AI suggest error:', err);
      showToast('AI提案に失敗しました', 'error');
    }
  }, [items, userId, reloadItems]);

  // === DERIVED DATA ===

  const taskItems = items.filter(i => i.type === 'task');
  const clipItems = items.filter(i => i.type === 'clip');
  const ideaItems = items.filter(i => i.type === 'idea');

  // Focus items: explicit focus first, then auto-fill
  const focusItems = getFocusItems(taskItems);

  // Today's progress
  const today = new Date().toDateString();
  const completedToday = taskItems.filter(i =>
    i.status === 'done' && i.completed_at && new Date(i.completed_at).toDateString() === today
  ).length;
  const totalToday = completedToday + focusItems.length;

  // Filtered items for clip/idea tabs
  const filteredClips = clipItems.filter(i => !tagFilter || i.tags.includes(tagFilter));
  const filteredIdeas = ideaItems.filter(i => !tagFilter || i.tags.includes(tagFilter));

  // Tags for clip/idea filter
  const allTags = Array.from(new Set(items.flatMap(i => i.tags)));

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {topTab === 'task' ? '☀️ 今やること' : topTab === 'clip' ? '📎 クリッピング' : '💡 アイデア'}
              </h2>
              {topTab === 'task' && (
                <button
                  onClick={() => setShowDump(true)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition hover:scale-105"
                  style={{ backgroundColor: '#1565C0' }}
                  title="脳内を吐き出す"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {/* Top tabs */}
            <div className="flex items-center gap-4 mb-4 border-b border-gray-200">
              {([
                { key: 'task' as TopTab, label: 'タスク', count: taskItems.length },
                { key: 'clip' as TopTab, label: 'クリッピング', count: clipItems.length },
                { key: 'idea' as TopTab, label: 'アイデア', count: ideaItems.length },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTopTab(t.key); setTagFilter(null); }}
                  className={`pb-2.5 text-sm font-medium border-b-2 transition ${
                    topTab === t.key
                      ? 'border-jinden-blue text-jinden-blue'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                  <span className="ml-1 text-xs opacity-60">({t.count})</span>
                </button>
              ))}
            </div>

            {/* === TASK TAB === */}
            {topTab === 'task' && (
              <>
                {/* PC Layout: two columns */}
                <div className="hidden md:grid md:grid-cols-[400px_1fr] md:gap-8">
                  {/* Left: Focus area */}
                  <div>
                    <FocusView
                      items={taskItems}
                      focusItems={focusItems}
                      completedToday={completedToday}
                      totalToday={totalToday}
                      onComplete={handleComplete}
                      onItemTap={setSelectedItem}
                      onAISuggest={handleAISuggest}
                      onGoToAll={() => setSubTab('all')}
                    />
                    {/* Kanban link */}
                    <button
                      onClick={() => setSubTab('kanban')}
                      className="mt-4 text-sm text-jinden-blue hover:underline"
                    >
                      カンバン表示 →
                    </button>
                  </div>

                  {/* Right: Sub-tabs + list */}
                  <div>
                    {/* Sub-tabs (PC) */}
                    <div className="flex items-center gap-3 mb-4">
                      {([
                        { key: 'all' as SubTab, label: '📋 すべて' },
                        { key: 'done' as SubTab, label: '✅ 完了' },
                        { key: 'kanban' as SubTab, label: '📊 カンバン' },
                      ]).map(t => (
                        <button
                          key={t.key}
                          onClick={() => setSubTab(t.key)}
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${
                            subTab === t.key
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Input */}
                    <div className="mb-4">
                      <QuickInput
                        onSubmit={handleQuickAdd}
                        onOpenBulk={() => setShowBulk(true)}
                        onImagePaste={handleImagePaste}
                      />
                    </div>

                    {subTab === 'all' && (
                      <AllTasksView
                        items={taskItems}
                        onItemTap={setSelectedItem}
                        onToggleComplete={handleToggleComplete}
                      />
                    )}
                    {subTab === 'done' && (
                      <CompletedView
                        items={taskItems}
                        onItemTap={setSelectedItem}
                      />
                    )}
                    {subTab === 'kanban' && (
                      <KanbanBoard
                        items={taskItems.filter(i => !tagFilter || i.tags.includes(tagFilter))}
                        chatCounts={chatCounts}
                        onStatusChange={handleStatusChange}
                        onCardClick={setSelectedItem}
                      />
                    )}
                  </div>
                </div>

                {/* Mobile Layout: single column with bottom tabs */}
                <div className="md:hidden">
                  {subTab === 'focus' && (
                    <FocusView
                      items={taskItems}
                      focusItems={focusItems}
                      completedToday={completedToday}
                      totalToday={totalToday}
                      onComplete={handleComplete}
                      onItemTap={setSelectedItem}
                      onAISuggest={handleAISuggest}
                      onGoToAll={() => setSubTab('all')}
                    />
                  )}
                  {subTab === 'all' && (
                    <AllTasksView
                      items={taskItems}
                      onItemTap={setSelectedItem}
                      onToggleComplete={handleToggleComplete}
                    />
                  )}
                  {subTab === 'done' && (
                    <CompletedView
                      items={taskItems}
                      onItemTap={setSelectedItem}
                    />
                  )}
                  {subTab === 'kanban' && (
                    <KanbanBoard
                      items={taskItems}
                      chatCounts={chatCounts}
                      onStatusChange={handleStatusChange}
                      onCardClick={setSelectedItem}
                    />
                  )}
                </div>
              </>
            )}

            {/* === CLIP TAB === */}
            {topTab === 'clip' && (
              <>
                {/* Tag filter */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <button
                      onClick={() => setTagFilter(null)}
                      className={`text-[11px] px-2 py-1 rounded-full font-medium transition ${
                        !tagFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      すべて
                    </button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                        className={`text-[11px] px-2 py-1 rounded-full font-medium transition ${
                          tagFilter === tag ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredClips.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400 text-sm">
                      クリッピングがありません
                    </div>
                  )}
                  {filteredClips.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-sm transition"
                    >
                      {item.link_thumbnail && (
                        <img src={item.link_thumbnail} alt="" className="w-full h-32 object-cover" />
                      )}
                      {item.image_url && !item.link_thumbnail && (
                        <img src={item.image_url} alt="" className="w-full h-32 object-cover" />
                      )}
                      <div className="p-3">
                        <div className="text-sm font-medium text-gray-800 leading-snug truncate">{item.title}</div>
                        {item.link_url && (
                          <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.link_url}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <ClipTags tags={item.tags} />
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {new Date(item.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* === IDEA TAB === */}
            {topTab === 'idea' && (
              <>
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <button
                      onClick={() => setTagFilter(null)}
                      className={`text-[11px] px-2 py-1 rounded-full font-medium transition ${
                        !tagFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      すべて
                    </button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                        className={`text-[11px] px-2 py-1 rounded-full font-medium transition ${
                          tagFilter === tag ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredIdeas.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400 text-sm">
                      アイデアがありません
                    </div>
                  )}
                  {filteredIdeas.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition"
                    >
                      <div className="text-sm font-medium text-gray-800 leading-snug">{item.title}</div>
                      {item.body && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</div>
                      )}
                      <div className="flex items-center gap-1.5 mt-3">
                        <ClipTags tags={item.tags} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Input for clip/idea on mobile */}
          {topTab !== 'task' && (
            <div className="mb-5 px-4 md:px-7">
              <QuickInput
                onSubmit={handleQuickAdd}
                onOpenBulk={() => setShowBulk(true)}
                onImagePaste={handleImagePaste}
              />
            </div>
          )}
        </main>

        {/* Mobile bottom tabs (task tab only) */}
        {topTab === 'task' && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom)]">
            {([
              { key: 'focus' as SubTab, label: '☀️フォーカス' },
              { key: 'all' as SubTab, label: '📋すべて' },
              { key: 'done' as SubTab, label: '✅完了' },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setSubTab(t.key)}
                className={`text-xs font-medium px-3 py-2 rounded-lg transition min-h-[44px] ${
                  subTab === t.key
                    ? 'text-jinden-blue bg-mist'
                    : 'text-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Bulk Input Modal */}
        <BulkInput
          isOpen={showBulk}
          onClose={() => setShowBulk(false)}
          onSubmit={handleBulkAdd}
        />

        {/* Dump Mode */}
        {userId && (
          <DumpMode
            isOpen={showDump}
            onClose={() => setShowDump(false)}
            onTasksCreated={reloadItems}
            userId={userId}
          />
        )}

        {/* Task Detail - use new sheet for tasks, old panel for clips/ideas */}
        {selectedItem && selectedItem.type === 'task' && (
          <TaskDetailSheet
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={handleItemUpdate}
            onDelete={handleDelete}
            onSetFocus={handleSetFocus}
          />
        )}
        {selectedItem && selectedItem.type !== 'task' && (
          <TaskDetail
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={handleItemUpdate}
          />
        )}

        <ToastContainer />
      </div>
    </AuthGuard>
  );
}

// === UTILITY FUNCTIONS ===

function getFocusItems(items: Item[]): Item[] {
  const nonDone = items.filter(i => i.status !== 'done');

  // Explicit focus items first
  const explicit = nonDone
    .filter(i => i.is_focus)
    .sort((a, b) => a.focus_order - b.focus_order);

  if (explicit.length >= 3) return explicit.slice(0, 3);

  // Auto-fill from today/in_progress/this_week
  const explicitIds = new Set(explicit.map(i => i.id));
  const autoPool = nonDone
    .filter(i => !explicitIds.has(i.id) && (i.status === 'today' || i.status === 'in_progress' || i.status === 'this_week'))
    .sort((a, b) => {
      const statusOrder: Record<string, number> = { today: 0, in_progress: 1, this_week: 2 };
      const sa = statusOrder[a.status] ?? 3;
      const sb = statusOrder[b.status] ?? 3;
      if (sa !== sb) return sa - sb;

      if (b.priority !== a.priority) return b.priority - a.priority;

      const typeOrder: Record<string, number> = { do: 0, contact: 1, decide: 2, errand: 3 };
      const ta = typeOrder[a.action_type || 'do'] ?? 3;
      const tb = typeOrder[b.action_type || 'do'] ?? 3;
      return ta - tb;
    });

  const needed = 3 - explicit.length;
  return [...explicit, ...autoPool.slice(0, needed)];
}

function ClipTags({ tags }: { tags: string[] }) {
  return (
    <>
      {tags.map(tag => {
        const style = getTagStyle(tag);
        return (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ color: style.color, backgroundColor: style.bg }}
          >
            #{tag}
          </span>
        );
      })}
    </>
  );
}

function scheduleNotifications() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
    return;
  }
  if (Notification.permission !== 'granted') return;

  const now = new Date();
  const hours = now.getHours();

  if (hours >= 8 && hours < 9) {
    showLocalNotification('おはようございます', '今日の「1つ」を決めましょう', '/tasks');
  } else if (hours >= 17 && hours < 18) {
    showLocalNotification('進捗どうですか？', '今日のタスクは完了しましたか？', '/tasks');
  } else if (hours >= 21 && hours < 22) {
    showLocalNotification('お疲れさまでした', '今日やったことを振り返りましょう', '/tasks');
  }
}

function showLocalNotification(title: string, body: string, _url: string) {
  const key = `notif_${title}_${new Date().toDateString()}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, 'true');

  new Notification(title, {
    body,
    icon: '/icon-192.png',
    tag: title,
  });
}
