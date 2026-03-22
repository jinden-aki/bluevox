'use client';

import { useState, useRef, useCallback } from 'react';
import { callClaude, parseJSON } from '@/lib/claude';
import { getApiKey } from '@/lib/api-key';
import { TASK_EXTRACT_PROMPT } from '@/lib/prompts/task-extract';
import { supabase } from '@/lib/supabase';
import { TaskItem } from '@/lib/types';
import { showToast } from '@/components/ui/Toast';

interface ParsedCapture {
  title: string;
  action_type: string;
  priority: number;
  tags: string[];
  due: string | null;
  ball_holder: string;
  ball_holder_name: string | null;
  project: string | null;
  notes: string | null;
  checked: boolean;
}

interface QuickCaptureProps {
  userId: string;
  onAdded: (tasks: TaskItem[]) => void;
}

export default function QuickCapture({ userId, onAdded }: QuickCaptureProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedCapture[] | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const analyzeText = async (content: string) => {
    const apiKey = await getApiKey();
    if (!apiKey) { showToast('APIキーが設定されていません', 'error'); return; }
    setLoading(true);
    try {
      const result = await callClaude({
        task: 'taskExtract',
        systemPrompt: TASK_EXTRACT_PROMPT,
        userContent: content,
        apiKey,
        maxTokens: 2000,
      });
      const items = parseJSON(result.text);
      if (Array.isArray(items)) {
        setParsed(items.map(i => ({ ...i, checked: true })));
      } else {
        showToast('解析できませんでした', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async (file: File) => {
    const apiKey = await getApiKey();
    if (!apiKey) { showToast('APIキーが設定されていません', 'error'); return; }
    setLoading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
      const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      const result = await callClaude({
        task: 'taskExtract',
        systemPrompt: TASK_EXTRACT_PROMPT,
        userContent: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: 'この画像からタスクを抽出してください' },
        ],
        apiKey,
        maxTokens: 2000,
      });
      const items = parseJSON(result.text);
      if (Array.isArray(items)) {
        setParsed(items.map(i => ({ ...i, checked: true })));
      } else {
        showToast('画像からタスクを抽出できませんでした', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) { await analyzeImage(file); return; }
      }
    }
    // テキスト（100文字以上でAI解析）
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length >= 100) {
      e.preventDefault();
      setText(pastedText);
      await analyzeText(pastedText);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await analyzeImage(file);
    }
  }, []);

  const handleSubmit = async () => {
    if (loading) return;
    if (parsed) {
      await bulkInsert();
    } else if (text.trim().length >= 100) {
      await analyzeText(text);
    } else if (text.trim()) {
      await quickInsert(text.trim());
    }
  };

  const quickInsert = async (title: string) => {
    const { data, error } = await supabase
      .from('items')
      .insert({ user_id: userId, type: 'task', title, action_type: 'do' })
      .select()
      .single();
    if (error) { showToast('追加に失敗しました', 'error'); return; }
    if (data) {
      onAdded([data as TaskItem]);
      setText('');
      showToast('追加しました', 'success');
    }
  };

  const bulkInsert = async () => {
    if (!parsed) return;
    const checked = parsed.filter(p => p.checked);
    if (checked.length === 0) return;
    const inserts = checked.map(p => ({
      user_id: userId,
      type: 'task',
      title: p.title,
      action_type: p.action_type || 'do',
      priority: p.priority || 0,
      tags: p.tags || [],
      due: p.due || null,
      ball_holder: p.ball_holder || 'self',
      ball_holder_name: p.ball_holder_name || null,
      ball_passed_at: p.ball_holder === 'other' ? new Date().toISOString() : null,
      project: p.project || null,
      notes: p.notes || null,
      ai_generated: true,
    }));
    const { data, error } = await supabase.from('items').insert(inserts).select();
    if (error) { showToast('追加に失敗しました', 'error'); return; }
    if (data) {
      onAdded(data as TaskItem[]);
      setParsed(null);
      setText('');
      showToast(`${data.length}件追加しました ✨`, 'success');
    }
  };

  const toggleParsed = (i: number) => {
    setParsed(prev => prev ? prev.map((p, idx) => idx === i ? { ...p, checked: !p.checked } : p) : null);
  };

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      {!parsed ? (
        <div
          className={`relative rounded-xl border-2 transition-colors ${isDragOver ? 'border-jinden-blue bg-mist' : 'border-gray-200'}`}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && text.trim() && text.length < 100) { e.preventDefault(); handleSubmit(); } }}
            placeholder="思いついたことを投げ込む... (画像もペーストOK)"
            className="w-full text-[16px] px-3 pt-3 pb-10 resize-none focus:outline-none bg-transparent rounded-xl"
            rows={2}
            disabled={loading}
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="cursor-pointer text-gray-400 hover:text-gray-600 p-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) analyzeImage(f); }}
                />
              </label>
              {text.length >= 100 && (
                <span className="text-[11px] text-jinden-blue bg-mist px-2 py-0.5 rounded-full">AI解析モード</span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="text-[12px] px-3 py-1 bg-jinden-blue text-white rounded-lg disabled:opacity-40 hover:bg-jinden-blue/90 transition-colors"
            >
              {loading ? '解析中...' : text.length >= 100 ? 'AI解析' : '追加'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-ink">✨ AI抽出結果 — 追加するタスクを選択</p>
            <button onClick={() => setParsed(null)} className="text-[12px] text-gray-400 hover:text-gray-600">キャンセル</button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
            {parsed.map((p, i) => (
              <label key={i} className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={p.checked}
                  onChange={() => toggleParsed(i)}
                  className="mt-0.5 accent-jinden-blue"
                />
                <div className="flex-1">
                  <p className="text-[13px] text-ink">{p.title}</p>
                  {p.due && <p className="text-[11px] text-gray-400">📅 {p.due}</p>}
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={bulkInsert}
            className="w-full py-2.5 text-[13px] font-semibold text-white bg-jinden-blue rounded-xl hover:bg-jinden-blue/90 transition-colors"
          >
            {parsed.filter(p => p.checked).length}件を追加
          </button>
        </div>
      )}
    </div>
  );
}
