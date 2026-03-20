'use client';

import { useState, useCallback } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { callClaude, parseJSON } from '@/lib/claude';
import { getTwinContext } from '@/lib/twin-context';
import { getXPostPrompt } from '@/lib/prompts/x-post';
import { getNoteArticlePrompt } from '@/lib/prompts/note-article';

/* ---------- types ---------- */

type Mode = 'x' | 'note';

interface XPost {
  tone: string;
  text: string;
  chars: number;
}

interface NoteResult {
  titles: string[];
  article: string;
  closing: string;
}

const X_POST_TYPES = [
  { value: '洞察投稿', label: '洞察投稿', desc: '「一般的にはAだが、実はBだ」構造' },
  { value: '動詞フレーム', label: '動詞フレーム', desc: '「名詞→動詞で見ると景色が変わる」構造' },
  { value: 'セッション実況', label: 'セッション実況', desc: '「今日○○な人と話した」構造' },
  { value: '逆説・問い', label: '逆説・問い', desc: '「○○って、本当にそうですか？」構造' },
];

const NOTE_TYPES = [
  { value: 'メソッド公開', label: 'メソッド公開', desc: '動詞で人を語るメソッドの一部公開' },
  { value: '原体験ストーリー', label: '原体験ストーリー', desc: 'じんでんのもがきの実話' },
  { value: '思想記事', label: '思想記事', desc: '5者の思想を自分の言葉で' },
];

const TONE_COLORS: Record<string, string> = {
  '本気': '#1565C0',
  '軽め': '#42A5F5',
  '問いかけ': '#E65100',
};

/* ---------- component ---------- */

export default function WriterPage() {
  const [mode, setMode] = useState<Mode>('x');

  // X post state
  const [xTheme, setXTheme] = useState('');
  const [xType, setXType] = useState(X_POST_TYPES[0].value);
  const [xPosts, setXPosts] = useState<XPost[]>([]);
  const [xEditing, setXEditing] = useState<Record<number, string>>({});

  // Note state
  const [noteTheme, setNoteTheme] = useState('');
  const [noteType, setNoteType] = useState(NOTE_TYPES[0].value);
  const [noteKeywords, setNoteKeywords] = useState('');
  const [noteResult, setNoteResult] = useState<NoteResult | null>(null);
  const [noteEditText, setNoteEditText] = useState('');

  // Shared state
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [noteCopied, setNoteCopied] = useState(false);

  /* ---- Get API key ---- */
  const getApiKey = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data } = await supabase
      .from('app_settings')
      .select('api_key_encrypted')
      .eq('user_id', session.user.id)
      .single();
    return data?.api_key_encrypted || null;
  }, []);

  /* ---- Generate X posts ---- */
  const handleGenerateX = useCallback(async () => {
    if (!xTheme.trim()) {
      showToast('テーマを入力してください', 'error');
      return;
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      showToast('API Keyが設定されていません。設定ページで登録してください。', 'error');
      return;
    }

    setGenerating(true);
    setXPosts([]);
    setXEditing({});

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const twinData = session?.user ? await getTwinContext(session.user.id) : '（データなし）';

      const prompt = getXPostPrompt(xType, xTheme, twinData);

      const result = await callClaude({
        task: 'writer',
        systemPrompt: prompt,
        userContent: `テーマ：${xTheme}\n投稿タイプ：${xType}\n\n上記のシステムプロンプトに従ってJSON形式で3パターンのX投稿を生成してください。`,
        apiKey,
        maxTokens: 4096,
      });

      const parsed = parseJSON(result.text);
      if (parsed?.posts && Array.isArray(parsed.posts)) {
        setXPosts(parsed.posts);
        showToast('3パターン生成しました', 'success');
      } else {
        showToast('生成結果の解析に失敗しました', 'error');
      }
    } catch (err: any) {
      console.error('X post generation error:', err);
      showToast('生成エラー: ' + (err.message || '不明なエラー'), 'error');
    } finally {
      setGenerating(false);
    }
  }, [xTheme, xType, getApiKey]);

  /* ---- Generate note article ---- */
  const handleGenerateNote = useCallback(async () => {
    if (!noteTheme.trim()) {
      showToast('テーマを入力してください', 'error');
      return;
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      showToast('API Keyが設定されていません。設定ページで登録してください。', 'error');
      return;
    }

    setGenerating(true);
    setNoteResult(null);
    setNoteEditText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const twinData = session?.user ? await getTwinContext(session.user.id) : '（データなし）';

      const prompt = getNoteArticlePrompt(noteType, noteTheme, noteKeywords, twinData);

      const result = await callClaude({
        task: 'writer',
        systemPrompt: prompt,
        userContent: `テーマ：${noteTheme}\n記事タイプ：${noteType}\nキーワード：${noteKeywords || 'なし'}\n\n上記のシステムプロンプトに従ってJSON形式でnote記事を生成してください。`,
        apiKey,
        maxTokens: 8192,
      });

      const parsed = parseJSON(result.text);
      if (parsed?.titles && parsed?.article) {
        setNoteResult(parsed);
        setNoteEditText(parsed.article);
        showToast('記事を生成しました', 'success');
      } else {
        showToast('生成結果の解析に失敗しました', 'error');
      }
    } catch (err: any) {
      console.error('Note generation error:', err);
      showToast('生成エラー: ' + (err.message || '不明なエラー'), 'error');
    } finally {
      setGenerating(false);
    }
  }, [noteTheme, noteType, noteKeywords, getApiKey]);

  /* ---- Copy to clipboard ---- */
  const handleCopy = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      setNoteCopied(true);
      setTimeout(() => setNoteCopied(false), 2000);
    }
  };

  /* ---- Post to X ---- */
  const handlePostToX = (text: string) => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  /* ---- Start editing X post ---- */
  const handleEditX = (index: number, text: string) => {
    setXEditing(prev => ({ ...prev, [index]: text }));
  };

  /* ---- Char count indicator ---- */
  const CharIndicator = ({ count }: { count: number }) => {
    const over = count > 140;
    return (
      <span className={`text-[11px] font-mono ${over ? 'text-red-500 font-bold' : count > 120 ? 'text-yellow-600' : 'text-gray-400'}`}>
        {count}字{over && ' (140字超)'}
      </span>
    );
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen" style={{ background: '#FAFAF8' }}>
          <Topbar />
          <div className="p-4 md:p-7 max-w-[800px] mx-auto">
            {/* Mode toggle tabs */}
            <div className="flex border-b-2 border-gray-200 mb-6 sticky top-14 bg-[#FAFAF8] z-10 -mx-4 px-4 md:mx-0 md:px-0">
              <button
                onClick={() => setMode('x')}
                className={`px-5 py-3 text-[14px] font-semibold transition border-b-2 -mb-[2px] ${
                  mode === 'x'
                    ? 'border-jinden-blue text-jinden-blue'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                X投稿
              </button>
              <button
                onClick={() => setMode('note')}
                className={`px-5 py-3 text-[14px] font-semibold transition border-b-2 -mb-[2px] ${
                  mode === 'note'
                    ? 'border-jinden-blue text-jinden-blue'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                note記事
              </button>
            </div>

            {/* ========== X投稿モード ========== */}
            {mode === 'x' && (
              <div>
                {/* Input Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm mb-6">
                  {/* Theme */}
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5">
                    テーマ / きっかけ
                  </label>
                  <textarea
                    value={xTheme}
                    onChange={(e) => setXTheme(e.target.value)}
                    placeholder="今日セッションで気づいたこと、思いついたこと、何でも。キーボードの🎤で音声入力もできます"
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition resize-none mb-4 min-h-[80px]"
                  />

                  {/* Type selection */}
                  <label className="block text-[12px] font-bold text-gray-700 mb-2">
                    投稿タイプ
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    {X_POST_TYPES.map((t) => (
                      <label
                        key={t.value}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition min-h-[44px] ${
                          xType === t.value
                            ? 'border-jinden-blue bg-mist/50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="x-type"
                          value={t.value}
                          checked={xType === t.value}
                          onChange={() => setXType(t.value)}
                          className="mt-0.5 accent-[#1565C0]"
                        />
                        <div>
                          <div className="text-[13px] font-medium text-gray-800">{t.label}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{t.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateX}
                    disabled={generating}
                    className="w-full py-3 bg-jinden-blue text-white rounded-lg text-[15px] font-bold hover:bg-vox transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div
                          className="w-5 h-5 border-2 rounded-full"
                          style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .6s linear infinite' }}
                        />
                        生成中...
                      </>
                    ) : (
                      '生成する'
                    )}
                  </button>
                </div>

                {/* Results */}
                {xPosts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[13px] font-bold text-gray-700">生成結果（3パターン）</h3>
                    {xPosts.map((post, i) => {
                      const isEditing = xEditing[i] !== undefined;
                      const displayText = isEditing ? xEditing[i] : post.text;
                      const charCount = displayText.length;
                      const borderColor = TONE_COLORS[post.tone] || '#1565C0';

                      return (
                        <div
                          key={i}
                          className="bg-white rounded-xl shadow-sm overflow-hidden"
                          style={{ background: '#EBF5FB' }}
                        >
                          <div className="bg-white rounded-xl m-1">
                            <div
                              className="p-4 md:p-5"
                              style={{ borderLeft: `4px solid ${borderColor}` }}
                            >
                              {/* Tone label + char count */}
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                                  style={{ background: borderColor }}
                                >
                                  {post.tone}トーン
                                </span>
                                <CharIndicator count={charCount} />
                              </div>

                              {/* Text */}
                              {isEditing ? (
                                <textarea
                                  value={xEditing[i]}
                                  onChange={(e) => setXEditing(prev => ({ ...prev, [i]: e.target.value }))}
                                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] leading-relaxed focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition resize-none min-h-[120px]"
                                />
                              ) : (
                                <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {post.text}
                                </p>
                              )}

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-2 mt-4">
                                <button
                                  onClick={() => handleCopy(displayText, i)}
                                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold border transition min-h-[44px] ${
                                    copiedIndex === i
                                      ? 'border-green-300 bg-green-50 text-green-700'
                                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {copiedIndex === i ? (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      コピーしました
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      コピー
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handlePostToX(displayText)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition min-h-[44px]"
                                  style={{ background: '#000' }}
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                  </svg>
                                  Xで投稿
                                </button>

                                <button
                                  onClick={() => {
                                    if (isEditing) {
                                      // Save edit
                                      setXPosts(prev => prev.map((p, idx) =>
                                        idx === i ? { ...p, text: xEditing[i], chars: xEditing[i].length } : p
                                      ));
                                      setXEditing(prev => {
                                        const next = { ...prev };
                                        delete next[i];
                                        return next;
                                      });
                                    } else {
                                      handleEditX(i, post.text);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition min-h-[44px]"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  {isEditing ? '保存' : '編集する'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========== note記事モード ========== */}
            {mode === 'note' && (
              <div>
                {/* Input Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm mb-6">
                  {/* Theme */}
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5">
                    テーマ
                  </label>
                  <input
                    type="text"
                    value={noteTheme}
                    onChange={(e) => setNoteTheme(e.target.value)}
                    placeholder="例：面接で見抜けない&quot;弱み&quot;の正体"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition mb-4 min-h-[44px]"
                  />

                  {/* Type selection */}
                  <label className="block text-[12px] font-bold text-gray-700 mb-2">
                    記事タイプ
                  </label>
                  <div className="space-y-2 mb-4">
                    {NOTE_TYPES.map((t) => (
                      <label
                        key={t.value}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition min-h-[44px] ${
                          noteType === t.value
                            ? 'border-jinden-blue bg-mist/50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="note-type"
                          value={t.value}
                          checked={noteType === t.value}
                          onChange={() => setNoteType(t.value)}
                          className="mt-0.5 accent-[#1565C0]"
                        />
                        <div>
                          <div className="text-[13px] font-medium text-gray-800">{t.label}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{t.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Keywords/memo */}
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5">
                    キーワード / メモ
                  </label>
                  <textarea
                    value={noteKeywords}
                    onChange={(e) => setNoteKeywords(e.target.value)}
                    placeholder="書きたいこと、伝えたいこと、使いたいエピソードなど。キーボードの🎤で音声入力もできます"
                    rows={5}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition resize-none mb-5 min-h-[120px]"
                  />

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateNote}
                    disabled={generating}
                    className="w-full py-3 bg-jinden-blue text-white rounded-lg text-[15px] font-bold hover:bg-vox transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div
                          className="w-5 h-5 border-2 rounded-full"
                          style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .6s linear infinite' }}
                        />
                        記事を生成中...
                      </>
                    ) : (
                      '記事を生成する'
                    )}
                  </button>
                </div>

                {/* Results */}
                {noteResult && (
                  <div className="space-y-4">
                    {/* Title suggestions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" style={{ background: '#EBF5FB' }}>
                      <h3 className="text-[13px] font-bold text-gray-700 mb-3">タイトル案</h3>
                      <div className="space-y-2">
                        {noteResult.titles.map((title, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border border-gray-100"
                          >
                            <span className="text-[14px] font-medium text-gray-800">
                              <span className="text-jinden-blue font-bold mr-2">{i + 1}.</span>
                              {title}
                            </span>
                            <button
                              onClick={() => handleCopy(title)}
                              className="text-[11px] text-gray-400 hover:text-jinden-blue transition flex-shrink-0 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Article body */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[13px] font-bold text-gray-700">記事本文</h3>
                        <span className="text-[11px] text-gray-400">{noteEditText.length}字</span>
                      </div>
                      <textarea
                        value={noteEditText}
                        onChange={(e) => setNoteEditText(e.target.value)}
                        className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-[13px] leading-[2] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition resize-y font-serif"
                        style={{ minHeight: '400px' }}
                      />

                      {/* Closing */}
                      {noteResult.closing && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-[11px] font-bold text-gray-400 mb-1">締めの一文</div>
                          <p className="text-[13px] text-gray-700 font-serif italic">{noteResult.closing}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => handleCopy(noteEditText)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold border transition min-h-[44px] ${
                            noteCopied
                              ? 'border-green-300 bg-green-50 text-green-700'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {noteCopied ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              コピーしました
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              コピー
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            window.open('https://note.com/intent/write', '_blank');
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition min-h-[44px]"
                          style={{ background: '#2cbe4e' }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          noteで公開
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
