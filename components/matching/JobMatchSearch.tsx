'use client';

import { useState, useCallback } from 'react';
import { callClaude } from '@/lib/claude';
import { parseJobResults } from '@/lib/parse-jobs';
import {
  getJobMatchingPrompt,
  buildTalentContext,
  buildSearchHint,
  WEB_SEARCH_TOOL,
} from '@/lib/prompts/job-matching';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';
import type { Talent, JobMatch } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JobMatchSearchProps {
  /** All talents loaded from Supabase (with analysis) */
  talents: Talent[];
  /** Anthropic API key */
  apiKey: string;
  /** Callback when search results are received */
  onResults: (results: JobMatch[], talentId: string, talentName: string, keywords: string) => void;
  /** Pre-selected talent ID (optional, e.g. when navigated from talent page) */
  defaultTalentId?: string;
  /** Pre-populated keywords (optional) */
  defaultKeywords?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function JobMatchSearch({
  talents,
  apiKey,
  onResults,
  defaultTalentId = '',
  defaultKeywords = '',
}: JobMatchSearchProps) {
  const [selectedTalentId, setSelectedTalentId] = useState(defaultTalentId);
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleSearch = useCallback(async () => {
    if (!selectedTalentId) {
      showToast('人材を選択してください', 'error');
      return;
    }

    const talent = talents.find(t => t.id === selectedTalentId);
    if (!talent) {
      showToast('人材が見つかりません', 'error');
      return;
    }

    if (!talent.analysis) {
      showToast('この人材にはまだ分析データがありません', 'error');
      return;
    }

    if (!apiKey) {
      showToast('API Keyが設定されていません。設定ページで登録してください。', 'error');
      return;
    }

    setLoading(true);
    setLoadingMessage('AIが案件を検索・マッチング中...');

    try {
      // Build prompt + context
      const systemPrompt = getJobMatchingPrompt();
      const talentContext = buildTalentContext({
        talent: { id: talent.id, name: talent.name, analysis: talent.analysis as Parameters<typeof buildTalentContext>[0]['talent']['analysis'] },
        keywords: keywords || undefined,
      });
      const searchHint = buildSearchHint(keywords || undefined);
      const userContent = talentContext + '\n\n' + searchHint;

      console.log('[BLUEVOX JM] Sending API request...');

      const result = await callClaude({
        task: 'jobMatching',
        systemPrompt,
        userContent,
        apiKey,
        tools: [WEB_SEARCH_TOOL],
        maxTokens: 8000,
      });

      console.log('[BLUEVOX JM] Response text length:', result.text.length);

      // Parse JSON with 3-strategy fallback
      const jobs = parseJobResults(result.text);
      console.log('[BLUEVOX JM] Parsed jobs:', jobs.length);

      if (jobs.length === 0) {
        showToast('案件が見つかりませんでした。キーワードを変えてもう一度お試しください。', 'error');
        onResults([], talent.id, talent.name, keywords || '自動');
        return;
      }

      // Sort by score descending
      jobs.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

      // Save to Supabase
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.user) {
          await supabase.from('job_match_results').insert({
            user_id: authSession.user.id,
            talent_id: talent.id,
            talent_name: talent.name,
            keywords: keywords || '自動',
            results: jobs,
          });
        }
      } catch (saveErr) {
        console.warn('[BLUEVOX JM] Failed to save results to Supabase:', saveErr);
      }

      onResults(jobs, talent.id, talent.name, keywords || '自動');
      showToast(`${jobs.length}件の案件が見つかりました`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '案件検索中にエラーが発生しました';
      console.error('[BLUEVOX JM] Error:', err);
      showToast(message, 'error');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [selectedTalentId, keywords, talents, apiKey, onResults]);

  // Filter talents that have analysis
  const analyzedTalents = talents.filter(t => t.analysis);

  return (
    <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-[18px] h-[18px] text-jinden-blue" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        案件マッチング検索
      </h3>

      <div className="flex items-end gap-3">
        {/* Talent select */}
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
            人材を選択
          </label>
          <select
            value={selectedTalentId}
            onChange={(e) => setSelectedTalentId(e.target.value)}
            disabled={loading}
            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue transition disabled:opacity-50"
          >
            <option value="">-- 人材を選択 --</option>
            {analyzedTalents.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.company ? `(${t.company})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Keywords input */}
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
            追加キーワード（任意）
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            disabled={loading}
            placeholder="例: SaaS, PM, AI, DX..."
            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue transition disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleSearch();
            }}
          />
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={loading || !selectedTalentId}
          className="inline-flex items-center gap-2 h-10 px-5 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? (
            <>
              <div
                className="w-4 h-4 border-2 rounded-full flex-shrink-0"
                style={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin .6s linear infinite',
                }}
              />
              検索中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              検索開始
            </>
          )}
        </button>
      </div>

      {/* Loading indicator */}
      {loading && loadingMessage && (
        <div className="mt-4 p-4 bg-mist/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 border-[2.5px] rounded-full flex-shrink-0"
              style={{
                borderColor: '#E0E0E0',
                borderTopColor: '#1565C0',
                animation: 'spin .6s linear infinite',
              }}
            />
            <div>
              <p className="text-[13px] text-gray-700 font-medium">{loadingMessage}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Web検索を実行し、強み動詞との適合度を分析しています（30秒〜1分）
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
