'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { GeneralChat } from '@/lib/types';
import { getApiKey } from '@/lib/api-key';
import { callClaudeChat } from '@/lib/claude';
import { getTwinContext } from '@/lib/twin-context';
import { getGeneralChatPrompt } from '@/lib/prompts/task-agent';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';

export default function ChatPage() {
  const [chats, setChats] = useState<GeneralChat[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadChats(user.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const loadChats = async (uid: string) => {
    const { data } = await supabase
      .from('general_chats')
      .select('*')
      .eq('user_id', uid)
      .order('created_at')
      .limit(100);
    if (data) setChats(data);
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading || !userId) return;
    setInput('');
    setLoading(true);

    try {
      // Save user message
      const { data: userMsg } = await supabase
        .from('general_chats')
        .insert({ user_id: userId, role: 'user', content: msg })
        .select()
        .single();

      if (userMsg) setChats(prev => [...prev, userMsg]);

      // Build messages for AI
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('APIキーが設定されていません');

      const twinData = await getTwinContext(userId);
      const systemPrompt = getGeneralChatPrompt(twinData);

      // Last 20 messages for context
      const recentChats = [...chats.slice(-18), { role: 'user' as const, content: msg }]
        .map(c => ({ role: c.role, content: c.content }));

      const result = await callClaudeChat({
        task: 'generalChat',
        systemPrompt,
        messages: recentChats,
        apiKey,
      });

      // Save AI response
      const { data: aiMsg } = await supabase
        .from('general_chats')
        .insert({ user_id: userId, role: 'assistant', content: result.text })
        .select()
        .single();

      if (aiMsg) setChats(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setChats(prev => [...prev, {
        id: 'error-' + Date.now(),
        user_id: userId!,
        role: 'assistant',
        content: `エラー: ${err.message}`,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = async () => {
    if (!userId) return;
    if (!confirm('チャット履歴をクリアしますか？')) return;
    await supabase.from('general_chats').delete().eq('user_id', userId);
    setChats([]);
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen flex flex-col">
          <Topbar />
          <div className="flex-1 flex flex-col max-w-[800px] w-full mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-7 pt-4 md:pt-7 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                💬 なんでも壁打ち
              </h2>
              {chats.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  履歴クリア
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-7 pb-4 space-y-3">
              {chats.length === 0 && !loading && (
                <div className="text-center py-16">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-sm text-gray-500">何でも投げかけてください。</p>
                  <p className="text-xs text-gray-400 mt-1">事業アイデア、振り返り、X投稿のネタ出しなど</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {['今週の振り返りをしたい', 'この判断は幹に繋がるか？', 'X投稿のネタを出して'].map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed max-w-[80%] ${
                      chat.role === 'user'
                        ? 'bg-jinden-blue text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {chat.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 px-4 md:px-7 py-3 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="メッセージを入力..."
                  rows={1}
                  className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-jinden-blue min-h-[44px] max-h-[120px]"
                  style={{ fieldSizing: 'content' } as any}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="bg-jinden-blue text-white rounded-xl px-4 py-3 disabled:opacity-40 hover:bg-vox transition min-h-[44px] self-end"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
