'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import JobMatchSearch from '@/components/matching/JobMatchSearch';
import JobMatchCard from '@/components/matching/JobMatchCard';
import ApplyMessageModal from '@/components/matching/ApplyMessageModal';
import ExportButtons from '@/components/matching/ExportButtons';
import type { Talent, JobMatch, JobMatchResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function MatchingPage() {
  // Data state
  const [talents, setTalents] = useState<Talent[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);

  // Search results state
  const [currentResults, setCurrentResults] = useState<JobMatch[]>([]);
  const [currentTalentId, setCurrentTalentId] = useState('');
  const [currentTalentName, setCurrentTalentName] = useState('');

  // Past results state
  const [pastResults, setPastResults] = useState<JobMatchResult[]>([]);
  const [viewingPastIndex, setViewingPastIndex] = useState<number | null>(null);

  // Apply modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyJob, setApplyJob] = useState<JobMatch | null>(null);

  // ---------------------------------------------------------------------------
  // Load initial data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        // Load talents
        const { data: talentsData } = await supabase
          .from('talents')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (talentsData) setTalents(talentsData);

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

        // Load past results
        const { data: pastData } = await supabase
          .from('job_match_results')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (pastData) setPastResults(pastData);
      } catch (err) {
        console.error('[BLUEVOX Matching] Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleResults = useCallback((results: JobMatch[], talentId: string, talentName: string, keywords: string) => {
    setCurrentResults(results);
    setCurrentTalentId(talentId);
    setCurrentTalentName(talentName);
    setViewingPastIndex(null);

    // Also add to past results locally
    if (results.length > 0) {
      const newResult: JobMatchResult = {
        id: crypto.randomUUID(),
        talent_id: talentId,
        talent_name: talentName,
        keywords,
        results,
        created_at: new Date().toISOString(),
      };
      setPastResults(prev => [newResult, ...prev.slice(0, 19)]);
    }
  }, []);

  const handleApply = useCallback((job: JobMatch) => {
    setApplyJob(job);
    setApplyModalOpen(true);
  }, []);

  const handleViewPast = (index: number) => {
    const past = pastResults[index];
    if (!past) return;
    setCurrentResults(past.results);
    setCurrentTalentId(past.talent_id);
    setCurrentTalentName(past.talent_name);
    setViewingPastIndex(index);
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const currentTalent = talents.find(t => t.id === currentTalentId);
  const high = currentResults.filter(j => (j.match_score ?? 0) >= 85).length;
  const mid = currentResults.filter(j => (j.match_score ?? 0) >= 60 && (j.match_score ?? 0) < 85).length;
  const low = currentResults.length - high - mid;

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
            {/* Page heading */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">案件マッチングAI</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                人材の強み動詞とプロフィールを元に、Web検索で最適な副業・業務委託案件をAIが自動マッチングします
              </p>
            </div>

            {/* Loading skeleton */}
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm p-8 text-center">
                <div
                  className="w-8 h-8 border-[2.5px] rounded-full mx-auto mb-3"
                  style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', animation: 'spin .6s linear infinite' }}
                />
                <p className="text-sm text-gray-500">データを読み込み中...</p>
              </div>
            ) : (
              <>
                {/* Search controls */}
                <JobMatchSearch
                  talents={talents}
                  apiKey={apiKey}
                  onResults={handleResults}
                />

                {/* Results area */}
                {currentResults.length > 0 && (
                  <div className="mt-6">
                    {/* Results header */}
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {currentTalentName} さんへの推薦案件
                        </h3>
                        <div className="text-[13px] text-gray-500 mt-0.5">
                          {currentResults.length}件
                          {' '}&mdash;{' '}
                          <span className="text-[#2E7D32] font-medium">高マッチ {high}</span>
                          {' / '}
                          <span className="text-[#F59E0B] font-medium">中マッチ {mid}</span>
                          {' / '}
                          <span className="text-gray-400">低マッチ {low}</span>
                          {viewingPastIndex !== null && (
                            <span className="ml-2 text-[11px] text-gray-400">（過去の検索結果）</span>
                          )}
                        </div>
                      </div>

                      {/* Export buttons */}
                      <ExportButtons jobs={currentResults} talentName={currentTalentName} coreSentence={currentTalent?.analysis?.core_sentence} />
                    </div>

                    {/* Job cards */}
                    <div className="space-y-4">
                      {currentResults.map((job, idx) => (
                        <JobMatchCard
                          key={`${job.company}-${job.title}-${idx}`}
                          job={job}
                          index={idx}
                          onApply={handleApply}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state (when no results yet) */}
                {currentResults.length === 0 && !loading && (
                  <div className="mt-6 bg-white border border-gray-200 rounded-[10px] shadow-sm p-12 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <p className="text-sm text-gray-500">
                      人材を選択して「検索開始」ボタンを押すと、AIが最適な案件を探します
                    </p>
                  </div>
                )}

                {/* Past search results section */}
                {pastResults.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      過去の検索結果
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 tracking-wide uppercase">人材名</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 tracking-wide uppercase">キーワード</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 tracking-wide uppercase">件数</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 tracking-wide uppercase">日時</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 tracking-wide uppercase"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pastResults.map((pr, idx) => {
                            const d = new Date(pr.created_at);
                            const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            const isViewing = viewingPastIndex === idx;

                            return (
                              <tr
                                key={pr.id}
                                className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${isViewing ? 'bg-mist/30' : ''}`}
                              >
                                <td className="px-4 py-2.5 text-[13px] text-gray-800 font-medium">{pr.talent_name}</td>
                                <td className="px-4 py-2.5 text-[12px] text-gray-500">{pr.keywords}</td>
                                <td className="px-4 py-2.5 text-[12px] text-gray-500">{pr.results?.length ?? 0}件</td>
                                <td className="px-4 py-2.5 text-[12px] text-gray-400">{dateStr}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => handleViewPast(idx)}
                                    className={`text-[11px] font-medium px-3 py-1 rounded transition ${
                                      isViewing
                                        ? 'bg-jinden-blue text-white'
                                        : 'text-jinden-blue hover:bg-mist'
                                    }`}
                                  >
                                    {isViewing ? '表示中' : '表示'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Toast container */}
        <ToastContainer />

        {/* Apply message modal */}
        {applyJob && currentTalent && (
          <ApplyMessageModal
            isOpen={applyModalOpen}
            onClose={() => {
              setApplyModalOpen(false);
              setApplyJob(null);
            }}
            talent={currentTalent}
            job={applyJob}
            apiKey={apiKey}
          />
        )}
      </div>
    </AuthGuard>
  );
}
