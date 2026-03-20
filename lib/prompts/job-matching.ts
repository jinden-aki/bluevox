// =============================================================================
// BLUEVOX Job Matching Prompt & Talent Context Builder
// Migrated from bluevox_app_complete.html (lines 2557-2625, 2680-2737)
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VerbEntry {
  id: string;
  name: string;
  transferable_positions?: string[];
  want_to?: string;
}

export interface PcmType {
  name: string;
}

export interface TalentAnalysis {
  core_sentence?: string;
  five_axes?: FiveAxes;
  sec03_five_axes?: FiveAxes;
  pcm?: {
    types?: PcmType[];
    activation?: string[];
    deactivation?: string[];
  };
  verb_analysis?: {
    self_function?: string;
    strength_verbs?: VerbEntry[];
    weakness_verbs?: VerbEntry[];
  };
  balance_wheel?: {
    motivation_essence?: string;
  };
  weakness_full?: Record<string, unknown>;
  for_you_extras?: {
    suitable_verb_jobs?: string[];
    unsuitable_verb_jobs?: string[];
  };
  career_highlights?: CareerHighlight[];
  inner_voice?: {
    belief?: {
      voice?: string;
    };
  };
}

export interface FiveAxes {
  talent_type?: string;
  total_lv?: string | number;
}

export interface CareerHighlight {
  role: string;
  detail?: string;
}

export interface Talent {
  id: string;
  name: string;
  analysis?: TalentAnalysis;
}

// ---------------------------------------------------------------------------
// Web Search Tool constant (max_uses: 5 for cost optimization)
// ---------------------------------------------------------------------------

export const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305' as const,
  name: 'web_search' as const,
  max_uses: 5,
};

// ---------------------------------------------------------------------------
// getJobMatchingPrompt
// ---------------------------------------------------------------------------

export function getJobMatchingPrompt(): string {
  const lines: string[] = [
    'あなたはBLUEVOX案件マッチングAIです。',
    '',
    '■ 役割',
    '以下の人材プロフィールを元に、副業・業務委託案件（週10〜20時間）をWeb検索で見つけ、マッチ度スコアと向き/不向きの理由を付けて12件以上提案してください。',
    '',
    '■ 検索戦略',
    '以下のクエリパターンでWeb検索を複数回実行せよ:',
    '- 「Wantedly 副業 業務委託 [転用職種]」',
    '- 「YOUTRUST 副業 [業界] [職種]」',
    '- 「LinkedIn 業務委託 [キーワード] 日本」',
    '- 「スタートアップ 副業 [職種] 募集」',
    '検索結果から実在する案件を優先的に取得し、URLを含めよ。',
    '',
    '■ 判定軸（優先順位順）',
    '1. 業務内容×強み動詞の一致度（最重要）',
    '2. 会社フェーズ（シード〜シリーズBが高スコア）',
    '3. 成長市場かどうか（SaaS, AI, DX, HealthTech, FinTech等）',
    '4. 消火条件との衝突（該当する場合はスコアを大幅に下げる）',
    '',
    '■ 金額推定ロジック',
    'シード期×週10h: 10〜15万円 / シリーズA×週15h: 15〜25万円 / シリーズB×週15-20h: 20〜35万円',
    'グロース/上場×週15-20h: 25〜45万円 / 専門性高い場合: 上記×1.3〜1.5倍',
    '金額は「推定」と明記。根拠として「フェーズ×職種×週時間の市場相場」と記載。',
    '',
    '■ 出力形式',
    '以下のJSON配列のみを出力。バックティック・説明文は一切不要。必ず [ で始めて ] で終わること。',
    '',
    '[',
    '  {',
    '    "company": "企業名",',
    '    "title": "案件タイトル（具体的に）",',
    '    "description": "業務内容の詳細。3〜5文で具体的に。",',
    '    "requirements": "求められるスキル・経験",',
    '    "source": "Wantedly / LinkedIn / YOUTRUST / 企業採用ページ",',
    '    "url_direct": "案件の直接URL（見つかれば。なければ空文字）",',
    '    "url_search": "検索URL（例: https://www.wantedly.com/projects?q=PM+副業+SaaS）",',
    '    "company_url": "企業サイトURL",',
    '    "phase": "シード / シリーズA / シリーズB / グロース / 上場",',
    '    "industry": "業界",',
    '    "employee_count": "従業員数目安",',
    '    "growth_signal": "成長シグナル（あれば）",',
    '    "growth_market": true,',
    '    "weekly_hours": "10〜15h",',
    '    "monthly_fee": "推定月額 20〜30万円",',
    '    "fee_basis": "金額根拠",',
    '    "match_score": 85,',
    '    "fit_reasons": ["理由1", "理由2"],',
    '    "risk_reasons": ["リスク1"],',
    '    "verb_match": ["S04:全体の地図を引く"],',
    '    "deactivation_check": "",',
    '    "jinden_note": "じんでんメモ"',
    '  }',
    ']',
    '',
    '■ 品質基準',
    '- 必ず12件以上出力',
    '- match_scoreは0〜100。85以上=高、60〜84=中、59以下=低',
    '- descriptionは3文以上。曖昧な1語は禁止',
    '- fit_reasonsは2個以上。強み動詞IDを含める',
    '- url_searchは必ず埋める',
    '- url_directは見つかった場合のみ。嘘URLは禁止',
    '- fee_basisは必ず埋める',
    '- jinden_noteは必ず埋める',
    '- JSONのみ出力。他のテキストは一切不要',
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// buildTalentContext — constructs the talent profile block for the prompt
// ---------------------------------------------------------------------------

export interface BuildTalentContextOptions {
  talent: Talent;
  keywords?: string;
}

export function buildTalentContext({ talent, keywords }: BuildTalentContextOptions): string {
  const a = talent.analysis;
  if (!a) return '';

  const fax: FiveAxes = a.five_axes ?? a.sec03_five_axes ?? {};
  const pcm = a.pcm ?? {};
  const va = a.verb_analysis ?? {};
  const bw = a.balance_wheel ?? {};
  const fye = a.for_you_extras ?? {};

  const strengthVerbs = (va.strength_verbs ?? [])
    .map((v) => `${v.id}:${v.name} → 転用:${(v.transferable_positions ?? []).join(',')}`)
    .join('\n');

  const weaknessVerbs = (va.weakness_verbs ?? [])
    .map((v) => `${v.id}:${v.name}`)
    .join('\n');

  const lines: string[] = [
    '■ 人材プロフィール',
    `氏名: ${talent.name}`,
    `存在の一文: ${a.core_sentence ?? ''}`,
    `タイプ: ${fax.talent_type ?? ''} / Lv: ${fax.total_lv ?? ''}`,
    `PCM第1: ${pcm.types?.[0]?.name ?? ''}`,
    `自己機能: ${va.self_function ?? ''}`,
    '',
    '■ 強み動詞',
    strengthVerbs,
    '',
    '■ 弱み動詞',
    weaknessVerbs,
    '',
    '■ 発動条件',
    (pcm.activation ?? []).join('\n'),
    '',
    '■ 消火条件',
    (pcm.deactivation ?? []).join('\n'),
    '',
    '■ 向いている仕事',
    (fye.suitable_verb_jobs ?? []).join('\n'),
    '',
    '■ 向いていない仕事',
    (fye.unsuitable_verb_jobs ?? []).join('\n'),
    '',
    `■ 副業動機: ${bw.motivation_essence ?? ''}`,
    keywords ? `■ 追加キーワード: ${keywords}` : '',
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// buildSearchHint — the instruction appended after talent context
// ---------------------------------------------------------------------------

export function buildSearchHint(keywords?: string): string {
  let hint =
    '今すぐWeb検索を実行し、この人材に最適な副業・業務委託案件を12件以上見つけてJSON配列で出力してください。';
  if (keywords) {
    hint += ` 追加キーワード: ${keywords}`;
  }
  return hint;
}
