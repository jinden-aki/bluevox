// =============================================================================
// BLUEVOX Apply Message Prompt
// Migrated from bluevox_app_complete.html (lines 4155-4247)
// =============================================================================

import type { Talent, TalentAnalysis } from './job-matching';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobResult {
  company?: string;
  title?: string;
  description?: string;
  requirements?: string;
  phase?: string;
  industry?: string;
  fit_reasons?: string[];
  verb_match?: string[];
}

export interface ApplyMessages {
  /** Polite / business-oriented version (300-400 chars) */
  formal: string;
  /** Wantedly-style / high-energy version (200-300 chars) */
  casual: string;
  /** YOUTRUST / DM-style concise version (100-150 chars) */
  short: string;
}

// ---------------------------------------------------------------------------
// buildApplyMessagePrompt
// ---------------------------------------------------------------------------

export interface BuildApplyMessagePromptOptions {
  talent: Talent;
  job: JobResult;
}

export function buildApplyMessagePrompt({
  talent,
  job,
}: BuildApplyMessagePromptOptions): string {
  const a: TalentAnalysis = talent.analysis ?? {};
  const pcm = a.pcm ?? {};
  const va = a.verb_analysis ?? {};
  const bw = a.balance_wheel ?? {};

  const strengthVerbs = (va.strength_verbs ?? [])
    .map((v) => `${v.name}（${v.want_to ?? ''}）`)
    .join('、');

  const careerHighlights = (a.career_highlights ?? [])
    .map((c) => `${c.role}：${(c.detail ?? '').substring(0, 100)}`)
    .join('\n');

  const lines: string[] = [
    'あなたはBLUEVOX応募メッセージ生成AIです。',
    '',
    '以下の人材プロフィールと案件情報から、副業・業務委託の応募メッセージを3パターン生成してください。',
    '',
    '■ 人材プロフィール',
    `氏名: ${talent.name}`,
    `存在の一文: ${a.core_sentence ?? ''}`,
    `強み動詞: ${strengthVerbs}`,
    `自己機能: ${va.self_function ?? ''}`,
    `PCM第1タイプ: ${pcm.types?.[0]?.name ?? ''}`,
    `副業動機: ${bw.motivation_essence ?? ''}`,
    '経歴ハイライト:',
    careerHighlights,
    `本人の声（信念）: ${a.inner_voice?.belief?.voice ?? ''}`,
    '',
    '■ 応募先案件',
    `企業名: ${job.company ?? ''}`,
    `案件タイトル: ${job.title ?? ''}`,
    `業務内容: ${job.description ?? ''}`,
    `求めるスキル: ${job.requirements ?? ''}`,
    `フェーズ: ${job.phase ?? ''}`,
    `業界: ${job.industry ?? ''}`,
    '',
    '■ マッチする理由（AIが分析済み）',
    (job.fit_reasons ?? []).join('\n'),
    '',
    '■ 動詞マッチ',
    (job.verb_match ?? []).join('、'),
    '',
    '■ 生成ルール',
    '1. 3パターン生成: formal（丁寧・ビジネス向け）、casual（Wantedly向け・熱量高め）、short（YOUTRUST/DM向け・簡潔）',
    '2. 全パターン共通で含める要素:',
    '   - 自己紹介（現職＋経験年数。会社名は伏せてOK）',
    '   - なぜこの案件に興味を持ったか（案件の具体的な業務内容に言及する）',
    '   - 自分の強みがどう活きるか（強み動詞を自然な言葉に変換して使う）',
    '   - 稼働可能時間（週10〜20h）',
    '   - 「ぜひ一度お話しさせていただけませんか」で締める',
    '3. 売り込み感を出すな。「お力になれれば」「一緒に挑戦したい」のトーンで',
    '4. 嘘は書くな。経歴に書いてないスキルを捏造するな',
    '5. formalは300〜400字、casualは200〜300字、shortは100〜150字',
    '',
    '■ 出力形式',
    'JSON形式で出力。バックティック不要。',
    '{',
    '  "formal": "丁寧版のメッセージ全文",',
    '  "casual": "カジュアル版のメッセージ全文",',
    '  "short": "簡潔版のメッセージ全文"',
    '}',
    '',
    'JSONのみ出力。他のテキストは一切不要。',
  ];

  return lines.join('\n');
}
