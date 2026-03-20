'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Item, ItemChat, ItemStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-key';
import { callClaudeChat } from '@/lib/claude';
import { getTwinContext } from '@/lib/twin-context';
import { getTaskAgentPrompt } from '@/lib/prompts/task-agent';
import { getTagStyle, PRESET_TAGS } from '@/lib/tags';

const STATUS_OPTIONS: { key: ItemStatus; label: string }[] = [
  { key: 'inbox', label: '未整理' },
  { key: 'this_week', label: '今週やる' },
  { key: 'today', label: '今日やる' },
  { key: 'in_progress', label: '進行中' },
  { key: 'done', label: '完了' },
];

interface TaskDetailProps {
  item: Item;
  onClose: () => void;
  onUpdate: (item: Item) => void;
}

export default function TaskDetail({ item, onClose, onUpdate }: TaskDetailProps) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body || '');
  const [tags, setTags] = useState<string[]>(item.tags);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [dueDate, setDueDate] = useState(item.due_date || '');
  const [dueTime, setDueTime] = useState(item.due_time || '');
  const [chats, setChats] = useState<ItemChat[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load chats
  useEffect(() => {
    loadChats();
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChats = async () => {
    const { data } = await supabase
      .from('item_chats')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at');
    if (data) setChats(data);
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  // Auto-save on field change
  const saveField = useCallback(async (updates: Partial<Item>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .select()
        .single();
      if (data) onUpdate(data);
    }, 500);
  }, [item.id, onUpdate]);

  const handleTitleBlur = () => {
    if (title !== item.title) saveField({ title });
  };

  const handleBodyBlur = () => {
    if (body !== (item.body || '')) saveField({ body });
  };

  const handleStatusChange = (newStatus: ItemStatus) => {
    setStatus(newStatus);
    const updates: Partial<Item> = { status: newStatus } as any;
    if (newStatus === 'done') (updates as any).completed_at = new Date().toISOString();
    else (updates as any).completed_at = null;
    saveField(updates);
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    saveField({ due_date: val || null } as any);
  };

  const handleDueTimeChange = (val: string) => {
    setDueTime(val);
    saveField({ due_time: val || null } as any);
  };

  const toggleTag = (tag: string) => {
    const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(newTags);
    saveField({ tags: newTags });
  };

  // AI Chat
  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save user message
      await supabase.from('item_chats').insert({
        user_id: user.id,
        item_id: item.id,
        role: 'user',
        content: msg,
      });

      // Reload chats to include user message
      const { data: freshChats } = await supabase
        .from('item_chats')
        .select('*')
        .eq('item_id', item.id)
        .order('created_at');
      if (freshChats) setChats(freshChats);

      // Call AI
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('APIキーが設定されていません');

      const twinData = await getTwinContext(user.id);
      const systemPrompt = getTaskAgentPrompt(twinData);

      // Build conversation context
      const contextMsg = `タスク: ${item.title}\nステータス: ${status}\nタグ: ${item.tags.join(', ')}\n期限: ${dueDate || 'なし'}\nメモ: ${body || 'なし'}`;

      const chatMessages = [
        { role: 'user' as const, content: contextMsg },
        { role: 'assistant' as const, content: 'このタスクを確実にやり切るために、まず3つのステップに分解しますか？それとも、いつやるかスケジュールを決めますか？' },
        ...(freshChats || []).map(c => ({ role: c.role as 'user' | 'assistant', content: c.content })),
      ];

      const result = await callClaudeChat({
        task: 'taskChat',
        systemPrompt,
        messages: chatMessages,
        apiKey,
      });

      // Save AI response
      await supabase.from('item_chats').insert({
        user_id: user.id,
        item_id: item.id,
        role: 'assistant',
        content: result.text,
      });

      // Reload chats
      const { data: finalChats } = await supabase
        .from('item_chats')
        .select('*')
        .eq('item_id', item.id)
        .order('created_at');
      if (finalChats) setChats(finalChats);
    } catch (err: any) {
      console.error('Chat error:', err);
      // Show error inline
      setChats(prev => [...prev, {
        id: 'error',
        user_id: '',
        item_id: item.id,
        role: 'assistant',
        content: `エラー: ${err.message}`,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Summarize chat
  const summarizeChat = async () => {
    if (chats.length < 6 || chatLoading) return;
    setChatLoading(true);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const chatText = chats.map(c => `${c.role}: ${c.content}`).join('\n');
      const result = await callClaudeChat({
        task: 'taskChat',
        systemPrompt: '会話を1〜2行で要約してください。要点のみ。',
        messages: [{ role: 'user', content: chatText }],
        apiKey,
      });

      const newBody = body ? `${body}\n\n--- AI要約 ---\n${result.text}` : `--- AI要約 ---\n${result.text}`;
      setBody(newBody);
      saveField({ body: newBody });
    } catch (err: any) {
      console.error('Summary error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Google Calendar link
  const openGoogleCalendar = () => {
    if (!dueDate) return;
    const startDate = dueTime
      ? `${dueDate.replace(/-/g, '')}T${dueTime.replace(/:/g, '')}00`
      : `${dueDate.replace(/-/g, '')}`;
    const endDate = startDate;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}`;
    window.open(url, '_blank');
  };

  const chatRounds = chats.filter(c => c.role === 'user').length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[199]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full md:w-[480px] bg-white z-[200] shadow-xl flex flex-col overflow-hidden animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition min-h-[44px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as ItemStatus)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-jinden-blue"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="px-4 pt-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-lg font-bold text-gray-900 outline-none w-full border-none bg-transparent"
              placeholder="タイトル"
            />
          </div>

          {/* Tags */}
          <div className="px-4 pt-2 flex flex-wrap items-center gap-1.5">
            {tags.map(tag => {
              const style = getTagStyle(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium hover:opacity-70 transition"
                  style={{ color: style.color, backgroundColor: style.bg }}
                >
                  #{tag} ×
                </button>
              );
            })}
            <button
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="text-[11px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded border border-dashed border-gray-300 transition"
            >
              + タグ
            </button>
          </div>

          {/* Tag picker */}
          {showTagPicker && (
            <div className="px-4 pt-2 flex flex-wrap gap-1.5">
              {Object.keys(PRESET_TAGS).filter(t => !tags.includes(t)).map(tag => {
                const style = PRESET_TAGS[tag];
                return (
                  <button
                    key={tag}
                    onClick={() => { toggleTag(tag); setShowTagPicker(false); }}
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium hover:opacity-70 transition"
                    style={{ color: style.color, backgroundColor: style.bg }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Due date + Calendar */}
          <div className="px-4 pt-3 flex items-center gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-jinden-blue"
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => handleDueTimeChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-jinden-blue"
            />
            {dueDate && (
              <button
                onClick={openGoogleCalendar}
                className="text-xs text-jinden-blue hover:underline flex items-center gap-1"
              >
                📅 カレンダーに追加
              </button>
            )}
          </div>

          {/* Link preview */}
          {item.link_url && (
            <div className="px-4 pt-3">
              <a
                href={item.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition"
              >
                {item.link_thumbnail && (
                  <img src={item.link_thumbnail} alt="" className="w-full h-32 object-cover" />
                )}
                <div className="p-3">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.link_title || item.link_url}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.link_url}</div>
                </div>
              </a>
            </div>
          )}

          {/* Image */}
          {item.image_url && (
            <div className="px-4 pt-3">
              <img src={item.image_url} alt="" className="rounded-lg max-h-[200px] object-cover" />
            </div>
          )}

          {/* Body / Notes */}
          <div className="px-4 pt-3">
            <div className="text-xs text-gray-500 font-medium mb-1">メモ</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={handleBodyBlur}
              placeholder="自由記述..."
              className="w-full text-sm border border-gray-200 rounded-lg p-3 outline-none focus:border-jinden-blue resize-none min-h-[80px]"
            />
          </div>

          {/* AI Chat Section */}
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                💬 AIと壁打ち
              </div>
              {chatRounds >= 3 && (
                <button
                  onClick={summarizeChat}
                  disabled={chatLoading}
                  className="text-[11px] text-jinden-blue hover:underline disabled:opacity-50"
                >
                  📝 要約
                </button>
              )}
            </div>

            {/* Initial AI message */}
            {chats.length === 0 && (
              <div className="bg-gray-100 rounded-lg rounded-tl-none p-3 text-sm text-gray-700 mb-2 max-w-[85%]">
                このタスクを確実にやり切るために、まず3つのステップに分解しますか？それとも、いつやるかスケジュールを決めますか？
              </div>
            )}

            {/* Chat messages */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-lg p-3 text-[13px] leading-relaxed max-w-[85%] ${
                      chat.role === 'user'
                        ? 'bg-jinden-blue text-white rounded-tr-none'
                        : 'bg-gray-100 text-gray-700 rounded-tl-none'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {chat.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg rounded-tl-none p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="flex gap-2 mt-3">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="メッセージを入力..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-jinden-blue min-h-[44px]"
              />
              <button
                onClick={sendChat}
                disabled={!chatInput.trim() || chatLoading}
                className="bg-jinden-blue text-white rounded-lg px-3 py-2.5 disabled:opacity-40 hover:bg-vox transition min-h-[44px]"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
