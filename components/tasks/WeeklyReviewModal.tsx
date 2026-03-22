'use client';

import { useState, useEffect } from 'react';
import { TaskItem, WeeklyReview } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { callClaude } from '@/lib/claude';
import { getApiKey } from '@/lib/api-key';
import { WEEKLY_REVIEW_PROMPT } from '@/lib/prompts/weekly-review';

interface WeeklyReviewModalProps {
  items: TaskItem[];
  userId: string;
  onClose: () => void;
}

function getWeekStart(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); // Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLastWeekStart(): Date {
  const ws = getWeekStart();
  ws.setDate(ws.getDate() - 7);
  return ws;
}

export default function WeeklyReviewModal({ items, userId, onClose }: WeeklyReviewModalProps) {
  const [learned, setLearned] = useState('');
  const [nextHypothesis, setNextHypothesis] = useState('');
  const [aiComment, setAiComment] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<WeeklyReview | null>(null);

  const lastWeekStart = getLastWeekStart();
  const lastWeekEnd = getWeekStart();

  const lastWeekDone = items.filter(i => {
    if (i.status !== 'done' || !i.completed_at) return false;
    const d = new Date(i.completed_at);
    return d >= lastWeekStart && d < lastWeekEnd;
  });

  const weekLabel = `${lastWeekStart.getMonth() + 1}/${lastWeekStart.getDate()} - ${lastWeekEnd.getMonth() + 1}/${new Date(lastWeekEnd.getTime() - 86400000).getDate()}`;

  useEffect(() => {
    const load = async () => {
      const weekStr = lastWeekStart.toISOString().slice(0, 10);
      const { data } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStr)
        .single();
      if (data) {
        setExisting(data as WeeklyReview);
        setLearned(data.learned || '');
        setNextHypothesis(data.next_hypothesis || '');
        setAiComment(data.ai_comment || '');
      }
    };
    load();
  }, [userId]);

  const handleAIComment = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) return;
    setAiLoading(true);
    try {
      const userContent = `
先週の完了タスク: ${lastWeekDone.map(t => t.title).join('、') || 'なし'}
学んだこと: ${learned}
来週の仮説: ${nextHypothesis}
`.trim();
      const result = await callClaude({
        task: 'weeklyReview',
        systemPrompt: WEEKLY_REVIEW_PROMPT,
        userContent,
        apiKey,
        maxTokens: 512,
      });
      setAiComment(result.text);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const weekStr = lastWeekStart.toISOString().slice(0, 10);
    const doneSummary = lastWeekDone.map(t => t.title).join('\n');
    const record = {
      user_id: userId,
      week_start: weekStr,
      done_summary: doneSummary,
      learned,
      next_hypothesis: nextHypothesis,
      ai_comment: aiComment,
    };

    if (existing) {
      await supabase.from('weekly_reviews').update(record).eq('id', existing.id);
    } else {
      await supabase.from('weekly_reviews').insert(record);
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl flex flex-col h-[95vh] md:h-auto md:max-h-[90vh]">
        <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-ink">📝 先週の振り返り（{weekLabel}）</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 完了タスク一覧 */}
        <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-2">今週やったこと（完了タスク）</p>
          {lastWeekDone.length === 0 ? (
            <p className="text-[13px] text-green-600">データなし</p>
          ) : (
            <ul className="space-y-1">
              {lastWeekDone.map(t => (
                <li key={t.id} className="flex items-start gap-2 text-[13px] text-green-800">
                  <span>✅</span>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">何を学んだ？</label>
            <textarea
              value={learned}
              onChange={e => setLearned(e.target.value)}
              placeholder="今週の気づき..."
              className="mt-1 w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-jinden-blue"
              rows={4}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">来週の仮説は？</label>
            <textarea
              value={nextHypothesis}
              onChange={e => setNextHypothesis(e.target.value)}
              placeholder="来週やること・試すこと..."
              className="mt-1 w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-jinden-blue"
              rows={4}
            />
          </div>

          <button
            onClick={handleAIComment}
            disabled={aiLoading || (!learned && !nextHypothesis)}
            className="w-full py-2.5 text-[13px] text-white bg-jinden-blue rounded-xl disabled:opacity-40 hover:bg-jinden-blue/90 transition-colors"
          >
            {aiLoading ? '🤖 AI分析中...' : '🤖 AIコメントをもらう'}
          </button>

          {aiComment && (
            <div className="p-3 bg-midnight/5 rounded-xl border border-midnight/10">
              <p className="text-[11px] font-bold text-gray-500 mb-2">💬 AIコメント</p>
              <p className="text-[13px] text-ink leading-relaxed">{aiComment}</p>
            </div>
          )}
        </div>

        </div>
      {/* Sticky footer */}
      <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button onClick={onClose} className="flex-1 py-3 text-[13px] text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]">
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 text-[13px] text-white bg-jinden-blue rounded-xl disabled:opacity-40 hover:bg-jinden-blue/90 transition-colors min-h-[44px]"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
    </div>
  );
}
