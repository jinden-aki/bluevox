'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import Badge, { LevelBadge } from '@/components/ui/Badge';
import ForYouSheet from '@/components/talent/ForYouSheet';
import ForYouPro from '@/components/talent/ForYouPro';
import ForCEOBlueprint from '@/components/talent/ForCEOBlueprint';
import ExportModal from '@/components/talent/ExportModal';
import { supabase } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-key';
import { callClaude, parseAnalysisJSON } from '@/lib/claude';
import { ANALYSIS_PROMPT } from '@/lib/prompts/analysis';
import { buildUserMsg } from '@/lib/build-user-msg';
import { showToast } from '@/components/ui/Toast';
import { createShareLink, getShareLinksForTalent, deactivateShareLink, getUnreadFeedbackCount } from '@/lib/share';
import type { ShareLink } from '@/lib/share';
import type { Talent, Session, AnalysisResult, JindenEval, ProfileData } from '@/lib/types';

/* ---------- types ---------- */

type TabKey = 'for-you' | 'for-you-pro' | 'blueprint' | 'matching' | 'feedback';

interface TalentListItem {
  id: string;
  name: string;
  company: string;
  status: string;
  created_at: string;
  session_id: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'new', label: '新規' },
  { value: 'analyzing', label: '分析中' },
  { value: 'review', label: 'レビュー待ち' },
  { value: 'ready', label: '推薦可能' },
  { value: 'd-ng', label: 'D-即NG' },
  { value: 'd-gem', label: 'D-原石' },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'for-you', label: '本人用シート' },
  { key: 'for-you-pro', label: 'ブラッシュアップ版' },
  { key: 'blueprint', label: '社長用Blueprint' },
  { key: 'matching', label: '案件マッチング' },
  { key: 'feedback', label: 'フィードバック' },
];

/* ---------- component ---------- */

export default function TalentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const talentId = params.id as string;

  // Main talent + session state
  const [talent, setTalent] = useState<Talent | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('for-you');

  // Left panel talent list state
  const [allTalents, setAllTalents] = useState<TalentListItem[]>([]);
  const [talentListLoading, setTalentListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  // Share link state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareExpiry, setShareExpiry] = useState<number | null>(30);
  const [existingLinks, setExistingLinks] = useState<ShareLink[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Feedback count
  const [feedbackCount, setFeedbackCount] = useState(0);

  /* ---- Load all talents for left panel ---- */
  useEffect(() => {
    const loadAllTalents = async () => {
      setTalentListLoading(true);
      const { data, error } = await supabase
        .from('talents')
        .select('id, name, company, status, created_at, session_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllTalents(data as TalentListItem[]);
      }
      setTalentListLoading(false);
    };

    loadAllTalents();
  }, []);

  /* ---- Load selected talent + session ---- */
  const loadTalent = useCallback(async () => {
    if (!talentId) return;
    setLoading(true);

    const { data: talentData, error: talentError } = await supabase
      .from('talents')
      .select('*')
      .eq('id', talentId)
      .single();

    if (talentError || !talentData) {
      setTalent(null);
      setSession(null);
      setLoading(false);
      return;
    }

    const t = talentData as Talent;
    setTalent(t);

    if (t.session_id) {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', t.session_id)
        .single();

      if (sessionData) {
        setSession(sessionData as Session);
      } else {
        setSession(null);
      }
    } else {
      setSession(null);
    }

    setLoading(false);
  }, [talentId]);

  useEffect(() => {
    loadTalent();
  }, [loadTalent]);

  /* ---- Load feedback count + share links ---- */
  useEffect(() => {
    if (!talentId) return;
    getUnreadFeedbackCount(talentId).then(setFeedbackCount);
    getShareLinksForTalent(talentId).then(setExistingLinks);
  }, [talentId]);

  /* ---- Share link handlers ---- */
  const handleGenerateLink = async () => {
    if (!talent) return;
    setGeneratingLink(true);
    const link = await createShareLink({
      talentId: talent.id,
      talentName: talent.name,
      expiresInDays: shareExpiry,
    });
    if (link) {
      const url = `${window.location.origin}/share/${link.token}`;
      setGeneratedLink(url);
      setExistingLinks((prev) => [link, ...prev]);
    }
    setGeneratingLink(false);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleDeactivateLink = async (linkId: string) => {
    await deactivateShareLink(linkId);
    setExistingLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  const handleShareViaLine = (url: string) => {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(url)}`, '_blank');
  };

  /* ---- Filtered talent list ---- */
  const filteredTalents = useMemo(() => {
    return allTalents.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.company && t.company.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = !statusFilter || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allTalents, searchQuery, statusFilter]);

  /* ---- Derived data ---- */
  const analysis = talent?.analysis as AnalysisResult | null;
  const _jindenEval = session?.jinden_direct_eval as JindenEval | null;
  const profileData = session?.profile_data as ProfileData | null;
  const fa = analysis?.five_axes;

  /* ---- Tab click handler ---- */
  const handleTabClick = (key: TabKey) => {
    if (key === 'matching') {
      router.push(`/talent/${talentId}/job-match`);
      return;
    }
    if (key === 'feedback') {
      router.push(`/talent/${talentId}/feedback`);
      return;
    }
    setActiveTab(key);
  };

  /* ---- Re-analysis handler ---- */
  const handleReanalyze = useCallback(async () => {
    if (!talent || !session) return;
    if (!session.memo) {
      showToast('セッションに面談メモがありません', 'error');
      return;
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      showToast('先にAPI設定でAPIキーを登録してください', 'error');
      return;
    }

    setReanalyzing(true);

    try {
      // Build user message from session data
      const jindenEval = session.jinden_direct_eval as JindenEval | null;
      const userMsg = buildUserMsg({
        name: session.talent_name,
        date: session.created_at.slice(0, 10),
        type: session.status === '40min' ? '40min' : '90min',
        memo: session.memo,
        jindenMemo: session.jinden_memo || undefined,
        jindenEval: jindenEval || undefined,
      });

      // Call Claude with latest ANALYSIS_PROMPT
      const result = await callClaude({
        task: 'analysis',
        systemPrompt: ANALYSIS_PROMPT,
        userContent: userMsg,
        apiKey,
        maxTokens: 16000,
      });

      const newAnalysis = parseAnalysisJSON(result.text);

      // Determine status from analysis
      let newStatus: string = talent.status;
      const fiveAxesMss = newAnalysis.five_axes?.mss;
      const dCheck = newAnalysis.d_check;
      let dResult: string | null = dCheck?.result ?? null;

      if (!dResult && fiveAxesMss) {
        if (fiveAxesMss.mind === 'D' || fiveAxesMss.stance === 'D' || fiveAxesMss.skill === 'D') {
          dResult = 'D-即NG';
        }
      }

      if (dResult === 'D-即NG') newStatus = 'd-ng';
      else if (dResult === 'D-原石') newStatus = 'd-gem';
      else if (talent.status === 'new' || talent.status === 'analyzing') newStatus = 'review';

      // Update talent record
      await supabase
        .from('talents')
        .update({ analysis: newAnalysis, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', talentId);

      // Update session record
      await supabase
        .from('sessions')
        .update({ analysis: newAnalysis, status: newStatus })
        .eq('id', talent.session_id);

      // Update left panel list
      setAllTalents(prev =>
        prev.map(t => t.id === talentId ? { ...t, status: newStatus } : t)
      );

      showToast('再分析が完了しました', 'success');

      // Reload talent data
      await loadTalent();
    } catch (err: any) {
      console.error('Re-analysis error:', err);
      showToast('再分析エラー: ' + (err.message || '不明なエラー'), 'error');
    } finally {
      setReanalyzing(false);
    }
  }, [talent, session, talentId, loadTalent]);

  /* ---- Shared layout shell ---- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">{children}</div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div
              className="w-10 h-10 border-[3px] mx-auto mb-3 rounded-full"
              style={{
                borderColor: '#E0E0E0',
                borderTopColor: '#1565C0',
                animation: 'spin .6s linear infinite',
              }}
            />
            <p className="text-sm text-gray-500">読み込み中...</p>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---- Not found state ---- */
  if (!talent) {
    return (
      <Shell>
        <div className="text-center py-32">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-500 mb-4">人材データが見つかりません</p>
          <button
            onClick={() => router.push('/talent')}
            className="text-sm text-jinden-blue hover:text-vox transition"
          >
            一覧に戻る
          </button>
        </div>
      </Shell>
    );
  }

  /* ---- Main render ---- */
  return (
    <Shell>
      <div className="flex gap-5">
        {/* ====== Left Panel: Talent List (hidden on mobile) ====== */}
        <aside className="w-[220px] flex-shrink-0 hidden md:block">
          <div className="bg-white border border-gray-300 rounded-[10px] shadow-sm overflow-hidden">
            {/* Search */}
            <div className="p-2.5 border-b border-gray-200">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="名前・会社で検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-jinden-blue focus:ring-1 focus:ring-jinden-blue/20 transition placeholder:text-gray-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full mt-1.5 px-2.5 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-jinden-blue focus:ring-1 focus:ring-jinden-blue/20 transition text-gray-700 appearance-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Talent list */}
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
              {talentListLoading ? (
                <div className="py-8 text-center">
                  <p className="text-[11px] text-gray-400">読み込み中...</p>
                </div>
              ) : filteredTalents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[11px] text-gray-400">該当する人材がありません</p>
                </div>
              ) : (
                filteredTalents.map((t) => {
                  const isActive = t.id === talentId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/talent/${t.id}`)}
                      className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition hover:bg-mist/50 ${
                        isActive ? 'bg-mist border-l-2 border-l-jinden-blue' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[13px] font-medium truncate ${
                            isActive ? 'text-jinden-blue' : 'text-gray-800'
                          }`}
                        >
                          {t.name}
                        </span>
                        <Badge status={t.status} className="!text-[9px] !px-1.5 !py-0 flex-shrink-0" />
                      </div>
                      {t.company && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{t.company}</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Count footer */}
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <p className="text-[10px] text-gray-400 text-center">
                {filteredTalents.length} / {allTalents.length} 件
              </p>
            </div>
          </div>
        </aside>

        {/* ====== Right Panel: Detail ====== */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => router.push('/talent')}
                className="text-gray-400 hover:text-gray-700 transition"
                aria-label="一覧に戻る"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">{talent.name}</h2>
                  {fa?.total_lv != null && <LevelBadge level={fa.total_lv} />}
                  <Badge status={talent.status} />
                </div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  {talent.company && <span>{talent.company}</span>}
                  {fa?.talent_type && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{fa.talent_type}タイプ</span>
                    </>
                  )}
                  {fa?.judgment && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{fa.judgment}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Share Link Button */}
              <button
                onClick={() => { setShareModalOpen(true); setGeneratedLink(null); setLinkCopied(false); }}
                className="inline-flex items-center gap-1.5 px-3 md:px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-[11px] md:text-[12px] font-semibold hover:bg-gray-50 transition min-h-[44px]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                共有リンク
              </button>

              {session && session.memo && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-jinden-blue text-jinden-blue rounded-lg text-[12px] font-semibold hover:bg-jinden-blue hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reanalyzing ? (
                  <>
                    <div
                      className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
                    />
                    再分析中...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    再分析
                  </>
                )}
              </button>
            )}
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex overflow-x-auto border-b border-gray-200 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={`relative px-3 md:px-4 py-2.5 text-[11px] md:text-[12px] font-semibold tracking-wide border-b-2 transition whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'border-jinden-blue text-jinden-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.key === 'feedback' && feedbackCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {feedbackCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div id="talent-tab-content">
            {!analysis ? (
              <div className="text-center py-20">
                <div className="text-gray-400 mb-2">
                  <svg
                    className="w-12 h-12 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">分析データがまだありません</p>
                <p className="text-xs text-gray-400 mt-1">セッションで分析を実行してください</p>
              </div>
            ) : (
              <>
                {activeTab === 'for-you' && (
                  <ForYouSheet analysis={analysis} name={talent.name} profileData={profileData} onExport={() => setExportOpen(true)} />
                )}
                {activeTab === 'for-you-pro' && (
                  <ForYouPro analysis={analysis} name={talent.name} />
                )}
                {activeTab === 'blueprint' && (
                  <ForCEOBlueprint
                    analysis={analysis}
                    name={talent.name}
                    profileData={profileData}
                  />
                )}
                {activeTab === 'matching' && (
                  <div className="bg-white border border-gray-300 rounded-[10px] p-6 shadow-sm">
                    <div className="text-center py-12">
                      <svg
                        className="w-12 h-12 mx-auto text-gray-300 mb-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">案件マッチング</h3>
                      <p className="text-xs text-gray-500 mb-4">
                        AIがこの人材に合った案件を検索します
                      </p>
                      <button
                        onClick={() => router.push(`/talent/${talentId}/job-match`)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        案件検索を開始
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {analysis && (
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          analysis={analysis}
          name={talent.name}
          profileData={profileData}
        />
      )}

      {/* Share Link Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShareModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <button
              onClick={() => setShareModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-[15px] font-semibold text-gray-900 mb-1">本人用の閲覧リンクを生成</h3>
            <p className="text-[12px] text-gray-500 mb-5 leading-relaxed">
              このリンクを本人に送ると、For Youシートを閲覧しフィードバックを送れます。PDFダウンロードは不可。
            </p>

            {!generatedLink ? (
              <>
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">有効期限</label>
                  <div className="flex gap-2">
                    {[
                      { value: 7, label: '7日' },
                      { value: 30, label: '30日' },
                      { value: null as number | null, label: '無期限' },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setShareExpiry(opt.value)}
                        className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition ${
                          shareExpiry === opt.value
                            ? 'bg-jinden-blue text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="w-full py-2.5 bg-jinden-blue text-white rounded-lg text-[13px] font-semibold hover:bg-vox transition disabled:opacity-50"
                >
                  {generatingLink ? 'リンクを生成中...' : 'リンクを生成'}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[12px] text-gray-700 break-all font-mono">{generatedLink}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyLink(generatedLink)}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition ${
                      linkCopied
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-jinden-blue text-white hover:bg-vox'
                    }`}
                  >
                    {linkCopied ? 'コピーしました' : 'コピー'}
                  </button>
                  <button
                    onClick={() => handleShareViaLine(generatedLink)}
                    className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition"
                    style={{ background: '#06C755', color: '#fff' }}
                  >
                    LINEで送る
                  </button>
                </div>
              </div>
            )}

            {/* Existing links */}
            {existingLinks.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-200">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">既存のリンク</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {existingLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-[11px]">
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="text-gray-500 truncate block">
                          .../{link.token.slice(0, 12)}...
                        </span>
                        {link.expires_at && (
                          <span className="text-gray-400 text-[10px]">
                            期限: {new Date(link.expires_at).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyLink(`${window.location.origin}/share/${link.token}`)}
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
                        >
                          コピー
                        </button>
                        <button
                          onClick={() => handleDeactivateLink(link.id)}
                          className="px-2 py-1 bg-white border border-red-200 rounded text-red-500 hover:bg-red-50"
                        >
                          無効化
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
