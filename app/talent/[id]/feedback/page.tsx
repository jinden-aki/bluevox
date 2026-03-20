'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import { showToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { getApiKey } from '@/lib/api-key';
import { callClaude, parseAnalysisJSON } from '@/lib/claude';
import { ANALYSIS_PROMPT } from '@/lib/prompts/analysis';
import { buildUserMsg } from '@/lib/build-user-msg';
import { getFeedbacksForTalent, updateFeedbackStatus } from '@/lib/share';
import type { Feedback } from '@/lib/share';
import type { Talent, Session, JindenEval } from '@/lib/types';

function FeedbackStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    new: { bg: '#FFF3E0', text: '#E65100', label: '新規', icon: '🟡' },
    read: { bg: '#E3F2FD', text: '#1565C0', label: '確認済み', icon: '🔵' },
    applied: { bg: '#E8F5E9', text: '#2E7D32', label: '反映済み', icon: '🟢' },
  };
  const c = config[status] || config.new;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>
      <span className="text-[9px]">{c.icon}</span>
      {c.label}
    </span>
  );
}

function FeedbackTypeIcon({ type }: { type: string }) {
  const icons: Record<string, { emoji: string; label: string }> = {
    voice: { emoji: '🎤', label: '音声' },
    file: { emoji: '📎', label: 'ファイル' },
    profile_update: { emoji: '👤', label: 'プロフィール変更' },
    text: { emoji: '📝', label: 'テキスト' },
  };
  const ic = icons[type] || icons.text;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 px-2 py-0.5 bg-gray-50 rounded-full" title={ic.label}>
      <span>{ic.emoji}</span>
      <span>{ic.label}</span>
    </span>
  );
}

function ProfileUpdateCard({ fb, onStatusChange }: { fb: Feedback; onStatusChange: (s: 'new' | 'read' | 'applied') => void }) {
  let changes: Record<string, string> = {};
  try {
    changes = JSON.parse(fb.content || '{}');
  } catch {}

  const fieldLabels: Record<string, string> = {
    age: '年齢',
    birthplace: '出身地',
    residence: '現住所',
    company: '会社名',
    department: '部署',
    position: '職種',
    education: '学歴',
    side_job_hours: '副業希望時間',
    side_job_remote: '副業リモート',
    hobbies: '趣味・特技',
    mbti: 'MBTI',
    profile_photo_url: '写真',
  };

  return (
    <div className="bg-white border-2 border-purple-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-purple-100" style={{ background: '#F5F0FF' }}>
        <div className="flex items-center gap-3">
          <span className="text-lg">👤</span>
          <div>
            <div className="text-[13px] font-semibold text-purple-800">プロフィール変更リクエスト</div>
            <div className="text-[11px] text-purple-500">
              {new Date(fb.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
          <div className="ml-auto">
            <FeedbackStatusBadge status={fb.status} />
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="space-y-2">
          {Object.entries(changes).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3 py-1.5">
              <span className="text-[12px] font-semibold text-gray-500 w-28 flex-shrink-0 text-right">
                {fieldLabels[key] || key}
              </span>
              <span className="text-[13px] text-gray-800">
                {key === 'profile_photo_url' ? (
                  <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#1565C0] hover:underline">写真を表示</a>
                ) : (
                  value
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 mr-2">ステータス:</span>
          {(['new', 'read', 'applied'] as const).map((st) => {
            const labels: Record<string, string> = { new: '新規', read: '確認済み', applied: '反映済み' };
            return (
              <button
                key={st}
                onClick={() => onStatusChange(st)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                  fb.status === st
                    ? 'bg-[#1565C0] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {labels[st]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const talentId = params.id as string;

  const [talent, setTalent] = useState<Talent | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: talentData } = await supabase
      .from('talents')
      .select('*')
      .eq('id', talentId)
      .single();

    if (talentData) {
      setTalent(talentData as Talent);

      if (talentData.session_id) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', talentData.session_id)
          .single();
        if (sessionData) setSession(sessionData as Session);
      }
    }

    const fbs = await getFeedbacksForTalent(talentId);
    setFeedbacks(fbs);

    setLoading(false);
  }, [talentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (fb: Feedback, newStatus: 'new' | 'read' | 'applied') => {
    await updateFeedbackStatus(fb.id, newStatus);
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === fb.id ? { ...f, status: newStatus } : f))
    );
  };

  const handleReanalyzeWithFeedback = async () => {
    if (!talent || !session || !session.memo) {
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
      const jindenEval = session.jinden_direct_eval as JindenEval | null;
      let userMsg = buildUserMsg({
        name: session.talent_name,
        date: session.created_at.slice(0, 10),
        type: session.status === '40min' ? '40min' : '90min',
        memo: session.memo,
        jindenMemo: session.jinden_memo || undefined,
        jindenEval: jindenEval || undefined,
      });

      // Append feedback data
      const newFeedbacks = feedbacks.filter((fb) => fb.status !== 'applied');
      if (newFeedbacks.length > 0) {
        userMsg += '\n\n■ 本人からのフィードバック（セッション後に本人が追加で送ってきた情報）\n';
        userMsg += '以下の内容を分析に組み込んで、より精度の高いBlueprintを生成してください。\n';
        userMsg += '本人の声はそのまま引用してください。\n';

        newFeedbacks.forEach((fb, i) => {
          userMsg += `\n[フィードバック${i + 1}]\n`;
          userMsg += `タイプ: ${fb.feedback_type}\n`;
          userMsg += `セクション: ${fb.section_key || '全体'}\n`;
          if (fb.content) {
            if (fb.feedback_type === 'profile_update') {
              userMsg += `プロフィール変更リクエスト: ${fb.content}\n`;
            } else {
              userMsg += `内容: 「${fb.content}」\n`;
            }
          }
          if (fb.file_name) userMsg += `添付ファイル: ${fb.file_name}\n`;
        });
      }

      const result = await callClaude({
        task: 'analysis',
        systemPrompt: ANALYSIS_PROMPT,
        userContent: userMsg,
        apiKey,
        maxTokens: 16000,
      });

      const newAnalysis = parseAnalysisJSON(result.text);

      // Determine status
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

      // Update records
      await supabase
        .from('talents')
        .update({ analysis: newAnalysis, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', talentId);

      await supabase
        .from('sessions')
        .update({ analysis: newAnalysis, status: newStatus })
        .eq('id', talent.session_id);

      // Mark feedbacks as applied
      for (const fb of newFeedbacks) {
        await updateFeedbackStatus(fb.id, 'applied');
      }

      showToast('フィードバックを含めた再分析が完了しました', 'success');
      await loadData();
    } catch (err: any) {
      console.error('Re-analysis error:', err);
      showToast('再分析エラー: ' + (err.message || '不明なエラー'), 'error');
    } finally {
      setReanalyzing(false);
    }
  };

  const newCount = feedbacks.filter((f) => f.status === 'new').length;
  const nonAppliedCount = feedbacks.filter((f) => f.status !== 'applied').length;

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[900px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/talent/${talentId}`)}
                  className="text-gray-400 hover:text-gray-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {talent?.name || '読み込み中...'} — フィードバック
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    本人からのフィードバック一覧
                    {newCount > 0 && (
                      <span className="ml-2 text-red-500 font-semibold">未読 {newCount}件</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Re-analyze CTA */}
            {nonAppliedCount > 0 && (
              <div
                className="mb-6 p-5 rounded-xl border flex items-center justify-between gap-4"
                style={{ background: '#F0F7FF', borderColor: '#D1E3FF' }}
              >
                <div>
                  <div className="text-[14px] font-semibold text-gray-900 mb-1">
                    未反映のフィードバックが{nonAppliedCount}件あります
                  </div>
                  <div className="text-[12px] text-gray-500">
                    フィードバックの内容をAI分析に組み込み、シートを更新できます
                  </div>
                </div>
                <button
                  onClick={handleReanalyzeWithFeedback}
                  disabled={reanalyzing}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-[13px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                  style={{ background: reanalyzing ? '#9E9E9E' : '#1565C0' }}
                >
                  {reanalyzing ? (
                    <>
                      <div
                        className="w-4 h-4 border-2 rounded-full"
                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .6s linear infinite' }}
                      />
                      再分析中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      フィードバックを含めて再分析
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div
                  className="w-8 h-8 border-[3px] rounded-full"
                  style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', animation: 'spin .6s linear infinite' }}
                />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-gray-500">フィードバックはまだありません</p>
                <p className="text-xs text-gray-400 mt-1">共有リンクを本人に送ると、ここにフィードバックが届きます</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((fb) =>
                  fb.feedback_type === 'profile_update' ? (
                    <ProfileUpdateCard
                      key={fb.id}
                      fb={fb}
                      onStatusChange={(s) => handleStatusChange(fb, s)}
                    />
                  ) : (
                    <div
                      key={fb.id}
                      className={`bg-white border rounded-xl shadow-sm overflow-hidden ${
                        fb.status === 'new' ? 'border-orange-200' : 'border-gray-200'
                      }`}
                    >
                      <div className="px-5 py-4">
                        {/* Meta row */}
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          <FeedbackTypeIcon type={fb.feedback_type} />
                          <span className="text-[12px] text-gray-500">
                            {new Date(fb.created_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {fb.section_key && (
                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                              {fb.section_key}
                            </span>
                          )}
                          <FeedbackStatusBadge status={fb.status} />
                        </div>

                        {/* Content */}
                        {fb.content && (
                          <div className="text-[14px] text-gray-800 leading-[1.8] mb-3 whitespace-pre-wrap">
                            {fb.content}
                          </div>
                        )}

                        {/* File */}
                        {fb.file_name && fb.file_url && (
                          <a
                            href={fb.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] hover:bg-[#E3F2FD] transition"
                            style={{ color: '#1565C0' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {fb.file_name}
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        )}

                        {/* Status actions */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                          <span className="text-[10px] text-gray-400 mr-2">ステータス:</span>
                          {(['new', 'read', 'applied'] as const).map((st) => {
                            const labels: Record<string, string> = { new: '新規', read: '確認済み', applied: '反映済み' };
                            return (
                              <button
                                key={st}
                                onClick={() => handleStatusChange(fb, st)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                                  fb.status === st
                                    ? 'bg-[#1565C0] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {labels[st]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )
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
