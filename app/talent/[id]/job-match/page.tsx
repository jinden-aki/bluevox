'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import JobMatchCard from '@/components/matching/JobMatchCard';
import ExportButtons from '@/components/matching/ExportButtons';
import type { Talent, JobMatch } from '@/lib/types';
import { callClaude } from '@/lib/claude';
import {
  getJobMatchingPrompt,
  buildTalentContext,
  buildSearchHint,
  WEB_SEARCH_TOOL,
} from '@/lib/prompts/job-matching';
import { parseJobResults } from '@/lib/parse-jobs';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TalentJobMatchPage() {
  const params = useParams();
  const id = params.id as string;

  // Data state
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Search state
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<JobMatch[]>([]);

  // ---------------------------------------------------------------------------
  // Load talent + API key + previous results
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        // Load talent
        const { data: talentData, error: talentError } = await supabase
          .from('talents')
          .select('*')
          .eq('id', id)
          .single();

        if (talentError || !talentData) {
          showToast('人材データが見つかりません', 'error');
          setLoading(false);
          return;
        }

        setTalent(talentData as Talent);

        // Load API key from app_settings
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: settings } = await supabase
            .from('app_settings')
            .select('api_key_encrypted')
            .eq('user_id', session.user.id)
            .single();

          if (settings?.api_key_encrypted) setApiKey(settings.api_key_encrypted);
        }

        // Load previous results
        const { data: prevData } = await supabase
          .from('job_match_results')
          .select('*')
          .eq('talent_id', id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (prevData && prevData.length > 0 && prevData[0].results) {
          setResults(prevData[0].results as JobMatch[]);
          setKeywords(prevData[0].keywords || '');
        }
      } catch (err) {
        console.error('[BLUEVOX JobMatch] Failed to load:', err);
        showToast('データの読み込みに失敗しました', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // ---------------------------------------------------------------------------
  // Search handler
  // ---------------------------------------------------------------------------
  const handleSearch = async () => {
    if (!talent) return;

    if (!talent.analysis) {
      showToast('この人材にはまだ分析データがありません', 'error');
      return;
    }

    if (!apiKey) {
      showToast('API Keyが設定されていません。設定ページで登録してください。', 'error');
      return;
    }

    setSearching(true);

    try {
      const systemPrompt = getJobMatchingPrompt();
      const talentContext = buildTalentContext({
        talent: {
          id: talent.id,
          name: talent.name,
          analysis: talent.analysis as Parameters<typeof buildTalentContext>[0]['talent']['analysis'],
        },
        keywords: keywords || undefined,
      });
      const searchHint = buildSearchHint(keywords || undefined);
      const userContent = talentContext + '\n\n' + searchHint;

      const result = await callClaude({
        task: 'jobMatching',
        systemPrompt,
        userContent,
        apiKey,
        tools: [WEB_SEARCH_TOOL],
        maxTokens: 8000,
      });

      const parsedResults = parseJobResults(result.text);

      if (parsedResults.length === 0) {
        showToast('案件が見つかりませんでした。キーワードを変えてお試しください。', 'error');
        setSearching(false);
        return;
      }

      // Sort by match score descending
      parsedResults.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

      setResults(parsedResults);

      // Save to Supabase
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.user) {
          await supabase.from('job_match_results').insert({
            user_id: authSession.user.id,
            talent_id: id,
            talent_name: talent.name,
            keywords: keywords || '',
            results: parsedResults,
          });
        }
      } catch (saveErr) {
        console.warn('[BLUEVOX JobMatch] Failed to save results:', saveErr);
      }

      showToast(`${parsedResults.length}件の案件が見つかりました`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '案件検索中にエラーが発生しました';
      console.error('[BLUEVOX JobMatch] Search error:', err);
      showToast(message, 'error');
    } finally {
      setSearching(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Generate apply handler (passed to JobMatchCard)
  // ---------------------------------------------------------------------------
  const handleGenerateApply = (job: JobMatch) => {
    // Placeholder for future apply message generation
    showToast(`${job.company} への応募文生成は準備中です`, 'info');
  };

  // ---------------------------------------------------------------------------
  // Derived data from talent analysis
  // ---------------------------------------------------------------------------
  const analysis = talent?.analysis;
  const fiveAxes = analysis?.five_axes;
  const strengthVerbs = analysis?.verb_analysis?.strength_verbs ?? [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">
            {/* Back button */}
            <Link
              href={`/talent/${id}`}
              className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-jinden-blue transition mb-5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              人材詳細に戻る
            </Link>

            {/* Loading state */}
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm p-8 text-center">
                <div
                  className="w-8 h-8 border-[2.5px] rounded-full mx-auto mb-3"
                  style={{
                    borderColor: '#E0E0E0',
                    borderTopColor: '#1565C0',
                    animation: 'spin .6s linear infinite',
                  }}
                />
                <p className="text-sm text-gray-500">読み込み中...</p>
              </div>
            ) : !talent ? (
              <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm p-8 text-center">
                <p className="text-sm text-gray-500">人材データが見つかりません</p>
              </div>
            ) : (
              <>
                {/* Talent summary header */}
                <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm p-5 mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">{talent.name}</h2>
                    {fiveAxes?.total_lv != null && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-midnight text-white">
                        Lv{fiveAxes.total_lv}
                      </span>
                    )}
                    {fiveAxes?.talent_type && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-mist text-jinden-blue">
                        {fiveAxes.talent_type}
                      </span>
                    )}
                  </div>

                  {analysis?.core_sentence && (
                    <p className="text-[13px] text-gray-600 italic mb-3">{analysis.core_sentence}</p>
                  )}

                  {/* Strength verb pills */}
                  {strengthVerbs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {strengthVerbs.map((sv, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#E8F5E9] border border-[#2E7D32]/30 text-[#2E7D32]"
                        >
                          {sv.id} {sv.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search input + button */}
                <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm p-5 mb-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-[18px] h-[18px] text-jinden-blue" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    案件マッチング検索
                  </h3>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 tracking-wide uppercase">
                        追加キーワード（任意）
                      </label>
                      <input
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        disabled={searching}
                        placeholder="例: SaaS, PM, AI, DX..."
                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue transition disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !searching) handleSearch();
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={searching || !talent.analysis}
                      className="inline-flex items-center gap-2 h-10 px-5 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {searching ? (
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

                  {/* Searching spinner */}
                  {searching && (
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
                          <p className="text-[13px] text-gray-700 font-medium">案件を検索中...</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Web検索を実行し、強み動詞との適合度を分析しています（30秒〜1分）
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Results */}
                {results.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {talent.name} さんへの推薦案件
                        </h3>
                        <div className="text-[13px] text-gray-500 mt-0.5">
                          {results.length}件
                          {' '}&mdash;{' '}
                          <span className="text-[#2E7D32] font-medium">
                            高マッチ {results.filter(j => (j.match_score ?? 0) >= 85).length}
                          </span>
                          {' / '}
                          <span className="text-[#F59E0B] font-medium">
                            中マッチ {results.filter(j => (j.match_score ?? 0) >= 60 && (j.match_score ?? 0) < 85).length}
                          </span>
                          {' / '}
                          <span className="text-gray-400">
                            低マッチ {results.filter(j => (j.match_score ?? 0) < 60).length}
                          </span>
                        </div>
                      </div>
                      <ExportButtons jobs={results} talentName={talent.name} coreSentence={analysis?.core_sentence} />
                    </div>

                    <div className="space-y-4">
                      {results.map((job, idx) => (
                        <JobMatchCard
                          key={`${job.company}-${job.title}-${idx}`}
                          job={job}
                          index={idx}
                          onApply={(job) => handleGenerateApply(job)}
                        />
                      ))}
                    </div>
                  </div>
                ) : !searching ? (
                  <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm p-10 text-center">
                    <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <p className="text-sm text-gray-500">
                      「検索開始」ボタンを押して、{talent.name} さんに最適な案件を探しましょう
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
