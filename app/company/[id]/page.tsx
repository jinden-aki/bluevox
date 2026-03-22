'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { callClaude, parseJSON } from '@/lib/claude';
import { COMPANY_ANALYSIS_PROMPT } from '@/lib/prompts/company-analysis';
import { showToast } from '@/components/ui/Toast';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import CompanyDiagnosisSheet from '@/components/company/CompanyDiagnosisSheet';
import type { Company, AdditionalMemo } from '@/lib/types';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [additionalMemo, setAdditionalMemo] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  useEffect(() => {
    loadCompany();
  }, [id]);

  const loadCompany = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (data && !error) {
      setCompany(data as Company);
    } else {
      showToast('企業データが見つかりません', 'error');
      router.push('/company');
    }
    setLoading(false);
  };

  const markComplete = async () => {
    if (!company) return;
    const { error } = await supabase
      .from('companies')
      .update({ status: 'complete' })
      .eq('id', company.id);
    if (!error) {
      setCompany(prev => prev ? { ...prev, status: 'complete' } : prev);
      showToast('完了にマークしました', 'success');
    }
  };

  const reanalyze = async () => {
    if (!company) return;

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    const { data: settings } = await supabase
      .from('app_settings')
      .select('api_key_encrypted')
      .eq('user_id', authSession.user.id)
      .single();

    const apiKey = settings?.api_key_encrypted;
    if (!apiKey) {
      showToast('先にAPI設定でAPIキーを登録してください', 'error');
      router.push('/settings');
      return;
    }

    setIsReanalyzing(true);

    try {
      // Add memo to additional_memos if filled
      const updatedMemos: AdditionalMemo[] = [
        ...(company.additional_memos || []),
        ...(additionalMemo.trim() ? [{ memo: additionalMemo.trim(), added_at: new Date().toISOString() }] : []),
      ];

      const newVersion = (company.analysis_version || 0) + 1;

      const keyPersonsText = (company.key_persons || []).length > 0
        ? company.key_persons.map(p => `- ${p.name}（${p.role}）: ${p.memo || ''}`)
          .join('\n')
        : '（キーパーソン情報なし）';

      const additionalMemosText = updatedMemos.length > 0
        ? updatedMemos.map((m, i) => `[追加メモ ${i + 1}] ${m.memo}`).join('\n')
        : '';

      const userContent = `
## 企業HP調査結果
${company.web_research ? JSON.stringify(company.web_research, null, 2) : '（なし）'}

## 企業情報
企業名: ${company.company_name}
HP URL: ${company.website_url || '（なし）'}

## ヒアリングメモ
${company.meeting_memo || '（なし）'}

## じんでんの3行メモ
① 本質的な課題: ${company.jinden_memo_issue || '（なし）'}
② 合う人材のタイプ: ${company.jinden_memo_fit_type || '（なし）'}
③ 紹介時の注意点: ${company.jinden_memo_caution || '（なし）'}

## キーパーソン情報
${keyPersonsText}

## 既存の分析結果（v${company.analysis_version}）
${company.analysis ? JSON.stringify(company.analysis, null, 2) : '（なし）'}

## 今回の追加情報（v${newVersion}用）
${additionalMemosText || '（追加情報なし）'}
`;

      const result = await callClaude({
        task: 'companyAnalysis',
        systemPrompt: COMPANY_ANALYSIS_PROMPT + '\n\n既存の分析を踏まえた上で、追加情報を統合して更新版を生成してください。',
        userContent,
        apiKey,
        maxTokens: 12000,
      });

      const analysis = parseJSON(result.text);
      if (!analysis) throw new Error('AI応答のJSON解析に失敗しました');

      await supabase.from('companies').update({
        analysis,
        additional_memos: updatedMemos,
        analysis_version: newVersion,
        status: 'review',
      }).eq('id', company.id);

      setAdditionalMemo('');
      showToast(`v${newVersion} の再分析が完了しました`, 'success');
      await loadCompany();
    } catch (err: any) {
      showToast('再分析エラー: ' + (err.message || '不明なエラー'), 'error');
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-0 md:ml-60 flex-1 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-[3px]" style={{ borderColor: '#E0E0E0', borderTopColor: '#0A1628', animation: 'spin .6s linear infinite' }} />
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (!company) return null;

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7">
            {/* Back + Actions */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <button
                onClick={() => router.push('/company')}
                className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                企業一覧に戻る
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">
                  v{company.analysis_version} {company.updated_at ? `· ${new Date(company.updated_at).toLocaleDateString('ja-JP')}` : ''}
                </span>
                {company.status !== 'complete' && (
                  <button
                    onClick={markComplete}
                    className="px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-[12px] font-medium hover:bg-green-50 transition"
                  >
                    完了にする
                  </button>
                )}
              </div>
            </div>

            {/* Diagnosis Sheet */}
            <CompanyDiagnosisSheet company={company} />

            {/* Re-analysis Section */}
            <div className="bg-white border border-gray-300 rounded-[10px] p-6 mt-6 max-w-[900px] mx-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">情報を追加して再分析</h3>

              <textarea
                value={additionalMemo}
                onChange={e => setAdditionalMemo(e.target.value)}
                placeholder="追加のヒアリングメモ、気づき、新しい情報など..."
                rows={4}
                className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 resize-none mb-4"
              />

              <button
                onClick={reanalyze}
                disabled={isReanalyzing}
                className="inline-flex items-center gap-2 px-5 py-3 bg-torch text-white rounded-lg text-[13px] font-semibold hover:bg-torch/80 transition disabled:opacity-50 min-h-[44px]"
              >
                {isReanalyzing ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin .6s linear infinite' }} />
                    再分析中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    新しい情報を含めて再分析
                  </>
                )}
              </button>

              {/* Analysis History */}
              {(company.additional_memos || []).length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="text-[11px] font-bold text-gray-500 mb-2">追加メモ履歴</div>
                  <div className="space-y-2">
                    {company.additional_memos.map((m, i) => (
                      <div key={i} className="text-[12px] text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-gray-400 mr-2">[{new Date(m.added_at).toLocaleDateString('ja-JP')}]</span>
                        {m.memo}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-gray-400">
                    分析履歴: v1（初回）{company.analysis_version > 1 ? ` → v${company.analysis_version}（最新）` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
