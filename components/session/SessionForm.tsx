'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { callClaude, parseAnalysisJSON } from '@/lib/claude';
import { ANALYSIS_PROMPT, buildAnalysisPrompt } from '@/lib/prompts/analysis';
import { buildUserMsg } from '@/lib/build-user-msg';
import { extractTwinData } from '@/lib/twin-extract';
import { showToast } from '@/components/ui/Toast';
import type { JindenEval, ProfileData } from '@/lib/types';
import { SEGMENT_CONFIG, type TalentSegment } from '@/lib/types';
import AnalysisProgress from './AnalysisProgress';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PCM_OPTIONS = ['未判定', 'シンカー', 'パシスター', 'ハーモナイザー', 'イマジナー', 'レベル', 'プロモーター'] as const;
const MSS_OPTIONS = ['未評価', 'D', 'C', 'B', 'B+', 'A', 'S', 'SA'] as const;
const MBTI_OPTIONS = ['未判定', 'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'] as const;
const SESSION_TYPE_OPTIONS = [
  { value: '90min', label: '90分セッション' },
  { value: '40min', label: '40分カジュアル' },
] as const;

// ---------------------------------------------------------------------------
// Tag input component
// ---------------------------------------------------------------------------

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
  color = '#1565C0',
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  color?: string;
}) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onAdd(val);
    }
    setInput('');
  };

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full"
              style={{ background: `${color}10`, color, border: `1px solid ${color}30` }}
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-0.5 text-[14px] opacity-50 hover:opacity-100 transition"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={addTag}
          className="px-3 py-2 text-[12px] font-medium text-jinden-blue border border-jinden-blue/30 rounded-lg hover:bg-jinden-blue/5 transition"
        >
          追加
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  date: string;
  type: string;
  company: string;
  years: string;
  memo: string;
  // Profile fields
  profilePhoto: string;
  age: string;
  birthplace: string;
  department: string;
  position: string;
  education: string;
  sideJobHours: string;
  sideJobRemote: string;
  sideJobStart: string;
  hobbies: string;
  mbti: string;
  // Jinden eval fields (PCM + MSS only)
  pcm1: string;
  pcm2: string;
  pcm3: string;
  mind: string;
  stance: string;
  skill: string;
  // 3-line memo
  jindenMemoCommunity: string;
  jindenMemoPersonality: string;
  jindenMemoFit: string;
  segment: TalentSegment;
}

function getInitialState(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: '',
    date: today,
    type: '90min',
    company: '',
    years: '',
    memo: '',
    profilePhoto: '',
    age: '',
    birthplace: '',
    department: '',
    position: '',
    education: '',
    sideJobHours: '',
    sideJobRemote: '',
    sideJobStart: '',
    hobbies: '',
    mbti: '未判定',
    pcm1: '未判定',
    pcm2: '未判定',
    pcm3: '未判定',
    mind: '未評価',
    stance: '未評価',
    skill: '未評価',
    jindenMemoCommunity: '',
    jindenMemoPersonality: '',
    jindenMemoFit: '',
    segment: 'ca',
  };
}

// ---------------------------------------------------------------------------
// Build ProfileData from form state
// ---------------------------------------------------------------------------

function buildProfileData(f: FormState, tags: { industries: string[]; roles: string[]; verbs: string[] }): ProfileData | null {
  const hasProfile =
    f.profilePhoto || f.age || f.birthplace ||
    f.department || f.position || f.education ||
    f.sideJobHours || f.sideJobRemote || f.sideJobStart ||
    f.hobbies || (f.mbti && f.mbti !== '未判定') ||
    tags.industries.length > 0 || tags.roles.length > 0 || tags.verbs.length > 0;

  if (!hasProfile) return null;

  return {
    profile_photo: f.profilePhoto || undefined,
    age: f.age || undefined,
    birthplace: f.birthplace || undefined,
    department: f.department || undefined,
    position: f.position || undefined,
    education: f.education || undefined,
    side_job_hours: f.sideJobHours || undefined,
    side_job_remote: f.sideJobRemote || undefined,
    side_job_start: f.sideJobStart || undefined,
    hobbies: f.hobbies || undefined,
    mbti: f.mbti !== '未判定' ? f.mbti : undefined,
    suggested_industries: tags.industries.length > 0 ? tags.industries : undefined,
    suggested_roles: tags.roles.length > 0 ? tags.roles : undefined,
    suggested_verbs: tags.verbs.length > 0 ? tags.verbs : undefined,
  };
}

// ---------------------------------------------------------------------------
// Build JindenEval from form state
// ---------------------------------------------------------------------------

function buildJindenEval(f: FormState): JindenEval | null {
  const hasJindenEval =
    f.company ||
    f.years ||
    (f.pcm1 && f.pcm1 !== '未判定') ||
    (f.mind && f.mind !== '未評価') ||
    (f.stance && f.stance !== '未評価') ||
    (f.skill && f.skill !== '未評価');

  if (!hasJindenEval) return null;

  return {
    company: f.company || undefined,
    years: f.years || undefined,
    pcm1: f.pcm1 || '未判定',
    pcm2: f.pcm2 || '未判定',
    pcm3: f.pcm3 || '未判定',
    mind: f.mind || '未評価',
    stance: f.stance || '未評価',
    skill: f.skill || '未評価',
  };
}

// ---------------------------------------------------------------------------
// Build jinden_memo JSON string from 3-line memo
// ---------------------------------------------------------------------------

function buildJindenMemo(f: FormState): string | null {
  const community = f.jindenMemoCommunity.trim();
  const personality = f.jindenMemoPersonality.trim();
  const fit = f.jindenMemoFit.trim();
  if (!community && !personality && !fit) return null;
  return JSON.stringify({ community, personality, fit });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(getInitialState);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Tag state (separate from FormState since arrays)
  const [suggestedIndustries, setSuggestedIndustries] = useState<string[]>([]);
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [suggestedVerbs, setSuggestedVerbs] = useState<string[]>([]);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // ---------------------------------------------------------------------------
  // Save draft (no analysis)
  // ---------------------------------------------------------------------------

  const saveDraft = async () => {
    if (!form.name.trim()) {
      showToast('氏名を入力してください', 'error');
      return;
    }

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) {
      showToast('ログインが必要です', 'error');
      return;
    }

    const jindenEval = buildJindenEval(form);
    const tags = { industries: suggestedIndustries, roles: suggestedRoles, verbs: suggestedVerbs };
    const profileData = buildProfileData(form, tags);
    const jindenMemo = buildJindenMemo(form);
    const sessionId = crypto.randomUUID();

    const { error } = await supabase.from('sessions').insert({
      id: sessionId,
      user_id: authSession.user.id,
      talent_name: form.name.trim(),
      company: form.company.trim() || null,
      years: form.years ? parseInt(form.years) : null,
      memo: form.memo.trim(),
      jinden_memo: jindenMemo,
      pcm_types: { first: form.pcm1, second: form.pcm2, third: form.pcm3 },
      mss: { mind: form.mind, stance: form.stance, skill: form.skill },
      lv: null,
      talent_type: null,
      jinden_direct_eval: jindenEval,
      profile_data: profileData,
      status: 'new',
      segment: form.segment,
    });

    if (error) {
      showToast('保存エラー: ' + error.message, 'error');
      return;
    }

    showToast('下書き保存しました', 'success');
    router.push('/');
  };

  // ---------------------------------------------------------------------------
  // Save & Analyze
  // ---------------------------------------------------------------------------

  const saveAndAnalyze = async () => {
    if (!form.name.trim()) {
      showToast('氏名を入力してください', 'error');
      return;
    }
    if (!form.memo.trim()) {
      showToast('面談メモを入力してください', 'error');
      return;
    }

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) {
      showToast('ログインが必要です', 'error');
      return;
    }

    // Check for API key in app_settings
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

    const jindenEval = buildJindenEval(form);
    const tags = { industries: suggestedIndustries, roles: suggestedRoles, verbs: suggestedVerbs };
    const profileData = buildProfileData(form, tags);
    const jindenMemo = buildJindenMemo(form);
    const sessionId = crypto.randomUUID();

    // 1. Save session to Supabase
    const { error: sessionError } = await supabase.from('sessions').insert({
      id: sessionId,
      user_id: authSession.user.id,
      talent_name: form.name.trim(),
      company: form.company.trim() || null,
      years: form.years ? parseInt(form.years) : null,
      memo: form.memo.trim(),
      jinden_memo: jindenMemo,
      pcm_types: { first: form.pcm1, second: form.pcm2, third: form.pcm3 },
      mss: { mind: form.mind, stance: form.stance, skill: form.skill },
      lv: null,
      talent_type: null,
      jinden_direct_eval: jindenEval,
      profile_data: profileData,
      status: 'analyzing',
      segment: form.segment,
    });

    if (sessionError) {
      showToast('保存エラー: ' + sessionError.message, 'error');
      return;
    }

    // 2. Show analysis progress
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Build the user message
      const sessionData = {
        name: form.name.trim(),
        date: form.date,
        type: form.type,
        memo: form.memo.trim(),
        jindenMemo: jindenMemo || undefined,
        jindenEval,
      };

      const userMsg = buildUserMsg(sessionData);

      // 3. Build analysis prompt with twin DB data
      let analysisPrompt = ANALYSIS_PROMPT;
      try {
        analysisPrompt = await buildAnalysisPrompt(authSession.user.id);
      } catch {
        // Fallback to base prompt if twin DB fetch fails
      }

      // 4. Call Claude API
      const result = await callClaude({
        task: 'analysis',
        systemPrompt: analysisPrompt,
        userContent: userMsg,
        apiKey,
        maxTokens: 16000,
      });

      // ★ デジタルツイン自動抽出（裏側で並列実行。失敗しても分析に影響なし）
      extractTwinData(form.memo.trim(), sessionId, form.name.trim(), apiKey, authSession.user.id)
        .then(r => {
          if (r.extracted > 0) {
            console.log(`[BLUEVOX Twin] ${r.extracted}件の新しい神田パターンを学習しました`);
          }
        })
        .catch(err => console.error('[BLUEVOX Twin] extraction failed:', err));

      // 5. Parse result (throws with debug info on failure)
      const analysis = parseAnalysisJSON(result.text);

      // Determine talent status from D-check
      let talentStatus: string = 'review';
      const dCheck = analysis.d_check;
      const fiveAxesMss = analysis.five_axes?.mss;
      let dResult: string | null = dCheck?.result ?? null;

      if (!dResult && fiveAxesMss) {
        if (fiveAxesMss.mind === 'D' || fiveAxesMss.stance === 'D' || fiveAxesMss.skill === 'D') {
          dResult = 'D-即NG';
        }
      }

      if (dResult === 'D-即NG') talentStatus = 'd-ng';
      else if (dResult === 'D-原石') talentStatus = 'd-gem';

      // 5. Save talent to Supabase
      const talentId = crypto.randomUUID();
      const { error: talentError } = await supabase.from('talents').insert({
        id: talentId,
        user_id: authSession.user.id,
        session_id: sessionId,
        name: form.name.trim(),
        company: form.company.trim() || null,
        status: talentStatus,
        segment: form.segment,
        analysis,
      });

      if (talentError) {
        throw new Error('人材データの保存に失敗しました: ' + talentError.message);
      }

      // Update session status
      await supabase
        .from('sessions')
        .update({ status: talentStatus, analysis })
        .eq('id', sessionId);

      showToast('AI分析が完了しました', 'success');

      // 6. Redirect to talent detail
      router.push('/talent/' + talentId);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'AI分析でエラーが発生しました');

      // Revert session status
      await supabase
        .from('sessions')
        .update({ status: 'new' })
        .eq('id', sessionId);

      showToast('分析エラー: ' + (err.message || '不明なエラー'), 'error');
    }
  };

  const handleRetry = () => {
    setIsAnalyzing(false);
    setAnalysisError(null);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isAnalyzing) {
    return (
      <AnalysisProgress error={analysisError} onRetry={handleRetry} />
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-[10px] shadow-sm" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-300">
        <h3 className="text-sm font-semibold text-gray-900">新規セッション登録</h3>
      </div>

      <div className="p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">氏名 *</label>
          <input
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
            value={form.name}
            onChange={set('name')}
            placeholder="例：鈴木太郎"
          />
        </div>

        {/* Segment Select — 4属性 */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            人材セグメント *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(SEGMENT_CONFIG) as [TalentSegment, typeof SEGMENT_CONFIG[TalentSegment]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, segment: key }))}
                  className={`flex items-center gap-2 px-3.5 py-3 rounded-lg border-2 text-left transition ${
                    form.segment === key
                      ? 'border-current shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: form.segment === key ? cfg.color : undefined,
                    backgroundColor: form.segment === key ? cfg.bgColor : undefined,
                  }}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  <div>
                    <div
                      className="text-[12px] font-semibold"
                      style={{ color: form.segment === key ? cfg.color : '#374151' }}
                    >
                      {cfg.labelShort}
                    </div>
                    <div className="text-[10px] text-gray-500">{cfg.label}</div>
                  </div>
                </button>
              ),
            )}
          </div>
        </div>

        {/* Date & Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">面談日</label>
            <input
              type="date"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
              value={form.date}
              onChange={set('date')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">面談種別</label>
            <select
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue bg-white"
              value={form.type}
              onChange={set('type')}
            >
              {SESSION_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Profile Section */}
        {/* ============================================================== */}
        <div className="border-t border-gray-300 pt-5 mt-2">
          <div className="text-sm font-bold text-jinden-blue mb-1">
            経歴プロフィール（任意）
          </div>
          <p className="text-[11px] text-gray-500 mb-4">
            For Youシート・For CEO Blueprintの冒頭プロフィールカードに表示されます
          </p>

          {/* Photo upload */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">プロフィール写真</label>
            <div className="flex items-center gap-4">
              {form.profilePhoto ? (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                  <img src={form.profilePhoto} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-gray-300">{form.name?.charAt(0) || '?'}</span>
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="text-[12px] text-gray-600"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      showToast('画像は2MB以下にしてください', 'error');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setForm(prev => ({ ...prev, profilePhoto: ev.target?.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <p className="text-[10px] text-gray-400 mt-0.5">2MB以下。Base64で保存されます</p>
              </div>
            </div>
          </div>

          {/* Age & Birthplace */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">年齢</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.age}
                onChange={set('age')}
                placeholder="28歳"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">出身地</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.birthplace}
                onChange={set('birthplace')}
                placeholder="東京都"
              />
            </div>
          </div>

          {/* Company & Years */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">会社名</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.company}
                onChange={set('company')}
                placeholder="CyberAgent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">新卒何年目</label>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.years}
                onChange={set('years')}
                placeholder="4"
              />
            </div>
          </div>

          {/* Department & Position */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">部署</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.department}
                onChange={set('department')}
                placeholder="プロダクト本部"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">役職</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.position}
                onChange={set('position')}
                placeholder="シニアPM"
              />
            </div>
          </div>

          {/* Education */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">学歴</label>
            <input
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
              value={form.education}
              onChange={set('education')}
              placeholder="慶應義塾大学 経済学部 卒業"
            />
          </div>

          {/* Side job preferences */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">副業可能時間/週</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.sideJobHours}
                onChange={set('sideJobHours')}
                placeholder="10時間/週"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">リモート可否</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.sideJobRemote}
                onChange={set('sideJobRemote')}
                placeholder="フルリモート希望"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">開始希望時期</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.sideJobStart}
                onChange={set('sideJobStart')}
                placeholder="来月から"
              />
            </div>
          </div>

          {/* Hobbies & MBTI */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">趣味・特技</label>
              <input
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue"
                value={form.hobbies}
                onChange={set('hobbies')}
                placeholder="登山、読書、ボードゲーム"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">MBTI</label>
              <select
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue bg-white"
                value={form.mbti}
                onChange={set('mbti')}
              >
                {MBTI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Memo */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">面談メモ *</label>
          <textarea
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue resize-y"
            rows={14}
            value={form.memo}
            onChange={set('memo')}
            placeholder={`面談中のメモ・走り書き・音声文字起こし、何でもOK。\n\n最低限：\n・没頭した瞬間とその理由\n・しんどかった時期とその原因\n・「事実か解釈か」への反応\n・本当にやりたいこと\n・自分を一文で言い表すと\n・PCMっぽさ（発話パターン）`}
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Whisperの文字起こしをそのまま貼ってもOK。AIが全項目を仮埋めします。
          </p>
        </div>

        {/* ============================================================== */}
        {/* Jinden Direct Evaluation Section (PCM + MSS only) */}
        {/* ============================================================== */}
        <div className="border-t border-gray-300 pt-5 mt-2">
          <div className="text-sm font-bold text-jinden-blue mb-1">
            じんでんの直接評価
          </div>
          <p className="text-[11px] text-gray-500 mb-4">
            面談中の3シグナル。PCMとMSSの初期判定を入力。
          </p>

          {/* PCM types */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(['pcm1', 'pcm2', 'pcm3'] as const).map((key, i) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  PCM 第{i + 1}タイプ
                </label>
                <select
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue bg-white"
                  value={form[key]}
                  onChange={set(key)}
                >
                  {PCM_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* MSS */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">マインド評価</label>
              <select
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue bg-white"
                value={form.mind}
                onChange={set('mind')}
              >
                {MSS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">スタンス評価</label>
              <select
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue bg-white"
                value={form.stance}
                onChange={set('stance')}
              >
                {MSS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">スキル評価</label>
              <select
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue bg-white"
                value={form.skill}
                onChange={set('skill')}
              >
                {MSS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 神田メモ（3行） */}
        {/* ============================================================== */}
        <div className="border-t border-gray-300 pt-5 mt-2">
          <div className="text-sm font-bold text-jinden-blue mb-1">
            神田メモ（3行）
          </div>
          <p className="text-[11px] text-gray-500 mb-4">
            面談後30分以内に。直感を3行で。
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                コミュニティ適性
              </label>
              <textarea
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue resize-none"
                rows={1}
                value={form.jindenMemoCommunity}
                onChange={set('jindenMemoCommunity')}
                placeholder="この人がコミュニティに入ったら？（一行で）"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                人物の一言印象
              </label>
              <textarea
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue resize-none"
                rows={1}
                value={form.jindenMemoPersonality}
                onChange={set('jindenMemoPersonality')}
                placeholder="一言で表すとどんな人？（一行で）"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                副業フィットイメージ
              </label>
              <textarea
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue resize-none"
                rows={1}
                value={form.jindenMemoFit}
                onChange={set('jindenMemoFit')}
                placeholder="どんな副業が合いそう？（一行で）"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* タグ入力 */}
        {/* ============================================================== */}
        <div className="border-t border-gray-300 pt-5 mt-2">
          <div className="text-sm font-bold text-jinden-blue mb-1">
            向いてそうな業界・職種・動詞
          </div>
          <p className="text-[11px] text-gray-500 mb-4">
            Enterまたはカンマで追加。マッチング時の参考タグになります。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">業界タグ</label>
              <TagInput
                tags={suggestedIndustries}
                onAdd={(tag) => setSuggestedIndustries(prev => [...prev, tag])}
                onRemove={(i) => setSuggestedIndustries(prev => prev.filter((_, j) => j !== i))}
                placeholder="例：SaaS、ヘルスケア、教育"
                color="#1565C0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">職種タグ</label>
              <TagInput
                tags={suggestedRoles}
                onAdd={(tag) => setSuggestedRoles(prev => [...prev, tag])}
                onRemove={(i) => setSuggestedRoles(prev => prev.filter((_, j) => j !== i))}
                placeholder="例：PM、事業開発、マーケ"
                color="#2D8C3C"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">動詞タグ</label>
              <TagInput
                tags={suggestedVerbs}
                onAdd={(tag) => setSuggestedVerbs(prev => [...prev, tag])}
                onRemove={(i) => setSuggestedVerbs(prev => prev.filter((_, j) => j !== i))}
                placeholder="例：設計する、巻き込む、最適化する"
                color="#E65100"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-2">
          <button
            type="button"
            onClick={saveDraft}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            下書き保存
          </button>
          <button
            type="button"
            onClick={saveAndAnalyze}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-torch text-white rounded-lg text-[13px] font-semibold hover:bg-orange-600 transition shadow-sm"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            保存してAI分析を実行
          </button>
        </div>
      </div>
    </div>
  );
}
