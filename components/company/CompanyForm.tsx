'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { callClaude, parseJSON } from '@/lib/claude';
import { COMPANY_ANALYSIS_PROMPT, WEB_RESEARCH_PROMPT } from '@/lib/prompts/company-analysis';
import { showToast } from '@/components/ui/Toast';
import { KEY_PERSON_ROLES, type KeyPerson } from '@/lib/types';

const PCM_OPTIONS = ['未判定', 'シンカー', 'パシスター', 'ハーモナイザー', 'イマジナー', 'レベル', 'プロモーター'] as const;

// ---------------------------------------------------------------------------
// Form State
// ---------------------------------------------------------------------------

interface FormState {
  companyName: string;
  websiteUrl: string;
  meetingDate: string;
  meetingMemo: string;
  jindenMemoIssue: string;
  jindenMemoFitType: string;
  jindenMemoCaution: string;
}

function getInitialState(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    companyName: '',
    websiteUrl: '',
    meetingDate: today,
    meetingMemo: '',
    jindenMemoIssue: '',
    jindenMemoFitType: '',
    jindenMemoCaution: '',
  };
}

// ---------------------------------------------------------------------------
// KeyPerson Card
// ---------------------------------------------------------------------------

function KeyPersonCard({
  person,
  onUpdate,
  onRemove,
}: {
  person: KeyPerson;
  onUpdate: (updated: KeyPerson) => void;
  onRemove: () => void;
}) {
  const set = (field: keyof KeyPerson, value: any) =>
    onUpdate({ ...person, [field]: value });

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-600 mb-1">氏名</label>
          <input
            value={person.name}
            onChange={e => set('name', e.target.value)}
            placeholder="鈴木太郎"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 min-h-[40px]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-600 mb-1">役割</label>
          <select
            value={person.role}
            onChange={e => set('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-midnight bg-white min-h-[40px]"
          >
            {KEY_PERSON_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {person.role === 'other' && (
        <div className="mb-3">
          <input
            value={person.role_label || ''}
            onChange={e => set('role_label', e.target.value)}
            placeholder="役割を入力..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-midnight min-h-[40px]"
          />
        </div>
      )}

      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={person.is_decision_maker}
            onChange={e => set('is_decision_maker', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-midnight focus:ring-midnight"
          />
          <span className="text-[12px] text-gray-700">🔑 意思決定者</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={person.is_interviewed}
            onChange={e => set('is_interviewed', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-midnight focus:ring-midnight"
          />
          <span className="text-[12px] text-gray-700">🎤 直接対話済み</span>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {(['pcm1', 'pcm2', 'pcm3'] as const).map((field, i) => (
          <div key={field}>
            <label className="block text-[10px] font-semibold text-gray-600 mb-1">PCM {i + 1}</label>
            <select
              value={person[field]}
              onChange={e => set(field, e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-[12px] focus:outline-none focus:border-midnight bg-white min-h-[36px]"
            >
              {PCM_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-gray-600 mb-1">メモ</label>
        <input
          value={person.memo}
          onChange={e => set('memo', e.target.value)}
          placeholder="即断即決。データよりも感覚で動く"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-midnight min-h-[40px]"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Overlay
// ---------------------------------------------------------------------------

function AnalysisProgress({ step, error, onRetry }: { step: number; error: string | null; onRetry?: () => void }) {
  const steps = ['企業情報を保存中', 'HP・企業情報をリサーチ中', 'カンパニーシートを生成中'];

  if (error) {
    return (
      <div className="bg-white border border-gray-300 rounded-[10px] p-10 text-center">
        <p className="text-red-600 font-medium mb-3">分析エラーが発生しました</p>
        <p className="text-[13px] text-gray-700 mb-6">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="px-5 py-2.5 bg-midnight text-white rounded-lg text-[13px] font-medium hover:bg-midnight/80 transition">
            再試行
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-[10px] p-10 text-center">
      <div className="w-12 h-12 mx-auto mb-6 rounded-full border-[3px]" style={{ borderColor: '#E0E0E0', borderTopColor: '#0A1628', animation: 'spin .6s linear infinite' }} />
      <p className="text-[15px] font-medium text-midnight mb-5">企業診断を実行中...</p>
      <div className="max-w-[360px] mx-auto text-left space-y-2">
        {steps.map((s, i) => {
          const isDone = i < step;
          const isActive = i === step;
          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] ${isDone ? 'bg-green-50 text-green-700' : isActive ? 'bg-gray-100 text-midnight font-medium' : 'text-gray-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-midnight text-white' : 'bg-gray-200 text-gray-500'}`}>
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (i + 1)}
              </span>
              {s}
              {isActive && <div className="w-4 h-4 ml-auto rounded-full border-2" style={{ borderColor: '#CBD5E1', borderTopColor: '#0A1628', animation: 'spin .6s linear infinite' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CompanyForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(getInitialState);
  const [keyPersons, setKeyPersons] = useState<KeyPerson[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const addKeyPerson = () => {
    const person: KeyPerson = {
      id: crypto.randomUUID(),
      name: '',
      role: 'ceo',
      is_decision_maker: false,
      is_interviewed: false,
      pcm1: '未判定',
      pcm2: '未判定',
      pcm3: '未判定',
      memo: '',
    };
    setKeyPersons(prev => [...prev, person]);
  };

  const updateKeyPerson = (id: string, updated: KeyPerson) =>
    setKeyPersons(prev => prev.map(p => p.id === id ? updated : p));

  const removeKeyPerson = (id: string) =>
    setKeyPersons(prev => prev.filter(p => p.id !== id));

  // ---------------------------------------------------------------------------
  // Save Draft
  // ---------------------------------------------------------------------------

  const saveDraft = async () => {
    if (!form.companyName.trim()) {
      showToast('企業名を入力してください', 'error');
      return;
    }
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) { showToast('ログインが必要です', 'error'); return; }

    const { error } = await supabase.from('companies').insert({
      user_id: authSession.user.id,
      company_name: form.companyName.trim(),
      website_url: form.websiteUrl.trim() || null,
      meeting_date: form.meetingDate || null,
      meeting_memo: form.meetingMemo.trim() || null,
      jinden_memo_issue: form.jindenMemoIssue.trim() || null,
      jinden_memo_fit_type: form.jindenMemoFitType.trim() || null,
      jinden_memo_caution: form.jindenMemoCaution.trim() || null,
      key_persons: keyPersons,
      status: 'new',
    });

    if (error) { showToast('保存エラー: ' + error.message, 'error'); return; }
    showToast('下書き保存しました', 'success');
    router.push('/company');
  };

  // ---------------------------------------------------------------------------
  // Save & Analyze
  // ---------------------------------------------------------------------------

  const saveAndAnalyze = async () => {
    if (!form.companyName.trim()) {
      showToast('企業名を入力してください', 'error');
      return;
    }

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) { showToast('ログインが必要です', 'error'); return; }

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

    // 1. Save to DB
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setAnalysisError(null);

    const companyId = crypto.randomUUID();
    const { error: insertError } = await supabase.from('companies').insert({
      id: companyId,
      user_id: authSession.user.id,
      company_name: form.companyName.trim(),
      website_url: form.websiteUrl.trim() || null,
      meeting_date: form.meetingDate || null,
      meeting_memo: form.meetingMemo.trim() || null,
      jinden_memo_issue: form.jindenMemoIssue.trim() || null,
      jinden_memo_fit_type: form.jindenMemoFitType.trim() || null,
      jinden_memo_caution: form.jindenMemoCaution.trim() || null,
      key_persons: keyPersons,
      status: 'analyzing',
    });

    if (insertError) {
      setAnalysisError('保存エラー: ' + insertError.message);
      return;
    }

    try {
      // 2. Web Research
      setAnalysisStep(1);
      const webPrompt = WEB_RESEARCH_PROMPT
        .replace('{company_name}', form.companyName.trim())
        .replace('{website_url}', form.websiteUrl.trim() || '（URL未入力）');

      let webResearch = null;
      try {
        const webResult = await callClaude({
          task: 'webResearch',
          systemPrompt: 'あなたは企業調査の専門家です。指定されたJSON形式のみで回答してください。',
          userContent: webPrompt,
          apiKey,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          extraBetas: ['web-search-2025-03-05'],
          maxTokens: 4096,
        });
        const parsed = parseJSON(webResult.text);
        if (parsed) {
          webResearch = { ...parsed, fetched_at: new Date().toISOString() };
          await supabase.from('companies').update({ web_research: webResearch }).eq('id', companyId);
        }
      } catch {
        // Web検索が失敗しても分析を継続
      }

      // 3. Company Analysis
      setAnalysisStep(2);

      const keyPersonsText = keyPersons.length > 0
        ? keyPersons.map(p => {
            const roleLabel = KEY_PERSON_ROLES.find(r => r.value === p.role)?.label || p.role;
            return `- ${p.name}（${p.role === 'other' ? (p.role_label || 'その他') : roleLabel}）${p.is_decision_maker ? ' [意思決定者]' : ''}${p.is_interviewed ? ' [直接対話済み]' : ''}
  PCM: ${p.pcm1} / ${p.pcm2} / ${p.pcm3}
  メモ: ${p.memo || '（なし）'}`;
          }).join('\n')
        : '（キーパーソン情報なし）';

      const userContent = `
## 企業HP調査結果
${webResearch ? JSON.stringify(webResearch, null, 2) : '（Web調査未実施 / URLなし）'}

## 企業情報
企業名: ${form.companyName.trim()}
HP URL: ${form.websiteUrl.trim() || '（未入力）'}
面談日: ${form.meetingDate || '（未入力）'}

## ヒアリングメモ
${form.meetingMemo.trim() || '（ヒアリングメモなし）'}

## じんでんの3行メモ
① 本質的な課題: ${form.jindenMemoIssue.trim() || '（未入力）'}
② 合う人材のタイプ: ${form.jindenMemoFitType.trim() || '（未入力）'}
③ 紹介時の注意点: ${form.jindenMemoCaution.trim() || '（未入力）'}

## キーパーソン情報
${keyPersonsText}
`;

      const analysisResult = await callClaude({
        task: 'companyAnalysis',
        systemPrompt: COMPANY_ANALYSIS_PROMPT,
        userContent,
        apiKey,
        maxTokens: 12000,
      });

      const analysis = parseJSON(analysisResult.text);
      if (!analysis) throw new Error('AI応答のJSON解析に失敗しました');

      await supabase.from('companies').update({
        analysis,
        status: 'review',
        analysis_version: 1,
      }).eq('id', companyId);

      router.push(`/company/${companyId}`);
    } catch (err: any) {
      setAnalysisError(err.message || '分析エラーが発生しました');
      await supabase.from('companies').update({ status: 'new' }).eq('id', companyId);
    }
  };

  if (isAnalyzing) {
    return (
      <AnalysisProgress
        step={analysisStep}
        error={analysisError}
        onRetry={() => { setIsAnalyzing(false); setAnalysisError(null); }}
      />
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-[10px] p-6 max-w-2xl mx-auto">
      <h2 className="text-[18px] font-semibold text-midnight mb-6">新規企業診断</h2>

      {/* Basic Info */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">企業名 *</label>
          <input
            value={form.companyName}
            onChange={set('companyName')}
            placeholder="株式会社〇〇"
            className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-[15px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">企業HP URL</label>
          <input
            type="url"
            value={form.websiteUrl}
            onChange={set('websiteUrl')}
            placeholder="https://example.com"
            className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-[15px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">面談日</label>
          <input
            type="date"
            value={form.meetingDate}
            onChange={set('meetingDate')}
            className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-[15px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 min-h-[44px]"
          />
        </div>
      </div>

      {/* Hearing Memo */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">ヒアリングメモ</label>
        <p className="text-[11px] text-gray-500 mb-2">面談の文字起こし・走り書き、何でもOK。AIが全部構造化します。</p>
        <textarea
          value={form.meetingMemo}
          onChange={set('meetingMemo')}
          rows={8}
          placeholder="今日の面談内容を自由に入力してください..."
          className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 resize-none"
        />
      </div>

      {/* 3-line Memo */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-gray-700 mb-3">じんでんの3行メモ（任意）</div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-500 w-5 flex-shrink-0">①</span>
            <input
              value={form.jindenMemoIssue}
              onChange={set('jindenMemoIssue')}
              placeholder="本質的な課題"
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-500 w-5 flex-shrink-0">②</span>
            <input
              value={form.jindenMemoFitType}
              onChange={set('jindenMemoFitType')}
              placeholder="合う人材のタイプ"
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-500 w-5 flex-shrink-0">③</span>
            <input
              value={form.jindenMemoCaution}
              onChange={set('jindenMemoCaution')}
              placeholder="紹介時の注意点"
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Key Persons */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-700">キーパーソン（任意・複数追加可）</div>
          <button
            type="button"
            onClick={addKeyPerson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-midnight/30 text-midnight rounded-lg text-[12px] font-medium hover:bg-midnight/5 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            キーパーソンを追加
          </button>
        </div>
        <div className="space-y-3">
          {keyPersons.map(p => (
            <KeyPersonCard
              key={p.id}
              person={p}
              onUpdate={updated => updateKeyPerson(p.id, updated)}
              onRemove={() => removeKeyPerson(p.id)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={saveDraft}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition min-h-[44px]"
        >
          下書き保存
        </button>
        <button
          type="button"
          onClick={saveAndAnalyze}
          className="flex-1 px-4 py-3 bg-midnight text-white rounded-lg text-[13px] font-semibold hover:bg-midnight/80 transition min-h-[44px] inline-flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          保存してAI分析
        </button>
      </div>
    </div>
  );
}
