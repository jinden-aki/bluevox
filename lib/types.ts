export interface ProfileData {
  profile_photo?: string; // base64 data URI
  age?: string;
  birthplace?: string;
  residence?: string;
  department?: string;
  position?: string;
  education?: string;
  side_job_hours?: string;
  side_job_remote?: string;
  side_job_start?: string;
  hobbies?: string;
  mbti?: string;
  suggested_industries?: string[];
  suggested_roles?: string[];
  suggested_verbs?: string[];
}

export interface Session {
  id: string;
  user_id: string;
  talent_name: string;
  company: string;
  years: number;
  memo: string;
  jinden_memo: string;
  pcm_types: { first: string; second: string; third: string };
  mss: { mind: string; stance: string; skill: string };
  lv: string;
  talent_type: string;
  jinden_direct_eval: JindenEval | null;
  profile_data: ProfileData | null;
  status: string;
  analysis: AnalysisResult | null;
  created_at: string;
  updated_at: string;
}

export interface JindenEval {
  company?: string;
  years?: string;
  pcm1?: string;
  pcm2?: string;
  pcm3?: string;
  mind?: string;
  stance?: string;
  skill?: string;
  talentType?: string;
  level?: string;
  coreSentence?: string;
  jindenComment?: string;
  strengthVerb?: string;
  strengthScene?: string;
  firstTask?: string;
  strengthNote?: string;
  weaknessVerb?: string;
  weaknessScene?: string;
  ceoProposal?: string;
  weaknessNote?: string;
  activation?: string[];
  deactivation?: string[];
  voice?: {
    belief?: string;
    dream?: string;
    pain?: string;
    challenge?: string;
  };
  motivationEssence?: string;
  motivation?: string;
  whyNow?: string;
  extra?: string;
  wheel?: Record<string, any>;
}

export interface Talent {
  id: string;
  user_id: string;
  session_id: string;
  name: string;
  company: string;
  status: 'new' | 'analyzing' | 'review' | 'ready' | 'd-ng' | 'd-gem' | 'deleted';
  analysis: AnalysisResult | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Matching {
  id: string;
  talent_id: string;
  talent_name: string;
  client_name: string;
  client_company: string;
  status: string;
  revenue: number;
  job_match_data: any;
  created_at: string;
}

export interface JobMatchResult {
  id: string;
  talent_id: string;
  talent_name: string;
  keywords: string;
  results: JobMatch[];
  created_at: string;
}

export interface JobMatch {
  company: string;
  title: string;
  description: string;
  requirements: string;
  source: string;
  url_direct: string;
  url_search: string;
  company_url: string;
  phase: string;
  industry: string;
  employee_count: string;
  growth_signal: string;
  growth_market: boolean;
  weekly_hours: string;
  monthly_fee: string;
  fee_basis: string;
  match_score: number;
  fit_reasons: string[];
  risk_reasons: string[];
  verb_match: string[];
  deactivation_check: string;
  jinden_note: string;
}

export interface VerbAnalysis {
  detected_root_verbs: { id: number; name: string; strength: string; evidence: string }[];
  strength_verbs: {
    id: string;
    name: string;
    root_combination: string;
    mss_axes: string[];
    want_to: string;
    evidence: string;
    transferable_positions: string[];
    paired_weakness_id: string;
  }[];
  weakness_verbs: {
    id: string;
    name: string;
    shadow_combination: string;
    belief_matrix: string;
    prescription: string;
    paired_strength_id: string;
  }[];
  self_function: string;
  self_function_roots: string;
  inquiry_theme: string;
}

export interface AnalysisResult {
  core_sentence: string;
  jinden_comment: string;
  raw_voice_intro: string;
  career_highlights: {
    period: string;
    role: string;
    detail: string;
    quote: string;
    warning: string;
  }[];
  five_axes: {
    talent_type: string;
    total_lv: number;
    judgment: string;
    mss: { mind: string; stance: string; skill: string };
    axes: {
      num: number;
      name: string;
      lv: number;
      layer: string;
      lv_meaning: string;
      evidence: string;
      for_ceo: string;
    }[];
    bottleneck: string;
    strongest: string;
  };
  pcm: {
    types: {
      rank: number;
      name: string;
      name_en: string;
      strength: number;
      behavior: string;
      quote: string;
      ceo_tip: string;
      need: string;
      distress: string;
      activation_examples?: string[];
    }[];
    activation: string[];
    deactivation: string[];
  };
  balance_wheel: {
    axes: {
      name: string;
      importance: number;
      satisfaction: number;
      gap_meaning: string;
    }[];
    motivation_essence: string;
    why_now: string;
  };
  inner_voice: {
    belief: { voice: string; jinden_note: string };
    dream: { voice: string; jinden_note: string };
    pain: { voice: string; jinden_note: string };
    challenge: { voice: string; jinden_note: string };
  };
  weakness_full: {
    essence: string;
    verb: string;
    symptoms: string[];
    ceo_proposal: string;
  };
  strength_full_disclosure: {
    verb_id: string;
    verb_name: string;
    deep_description: string;
    person_quote: string;
    explosive_scenes: { title: string; story: string }[];
    transferable_tags: string[];
    five_perspective_note: string;
  }[];
  thriving_scenes: {
    title: string;
    story: string;
    why: string;
    tags: string[];
  }[];
  struggling_scenes: {
    title: string;
    story: string;
    why: string;
  }[];
  five_qa: {
    question: string;
    answer: string;
    lens: string;
  }[];
  recommendation: string;
  verb_analysis: VerbAnalysis;
  for_you_extras: {
    jinden_comment_for_person: string;
    strength_detail_for_person: {
      verb_id: string;
      definition_for_person: string;
      related_episodes: string;
    }[];
    weakness_for_person: {
      verb_id: string;
      description_for_person: string;
      growth_hint: string;
      struggling_scenes?: { title: string; story: string }[];
      prescription?: string;
      jinden_message?: string;
    }[];
    suitable_verb_jobs: string[];
    unsuitable_verb_jobs: string[];
  };
}

export interface ThoughtItem {
  id: string;
  user_id: string;
  dimension: string;
  content: string;
  sort_order: number;
  created_at: string;
}

export type ThoughtDimension = '信念' | '判断基準' | '口癖' | '問い' | 'トーン' | '比喩' | '禁句' | '自己パターン認識';

// Items (tasks, clips, ideas)
export type ItemType = 'task' | 'clip' | 'idea';
export type ItemStatus = 'inbox' | 'this_week' | 'today' | 'in_progress' | 'done';

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  body: string | null;
  tags: string[];
  status: ItemStatus;
  priority: number;
  due_date: string | null;
  due_time: string | null;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  link_thumbnail: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Task Manager v3 fields
  action_type: string;
  time_slot: string;
  due: string | null;
  estimated_minutes: number | null;
  assignee: string;
  contact_persons: string[];
  sub_category: string | null;
  project: string | null;
  ai_generated: boolean;
  is_focus: boolean;
  focus_order: number;
  // Unified inbox fields
  url: string | null;
  source: string | null;
  memo: string | null;
  twin_candidate: boolean;
}

export interface ItemChat {
  id: string;
  user_id: string;
  item_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface GeneralChat {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ============================================================
// Task Management Types
// ============================================================

export type ActionType = 'do' | 'contact' | 'decide' | 'errand'
export type TaskPriority = 0 | 1 | 2 | 3
export type TaskStatus = 'inbox' | 'this_week' | 'today' | 'in_progress' | 'done' | 'deleted'

export interface TaskItem {
  id: string
  user_id: string
  title: string
  action_type: ActionType
  priority: TaskPriority
  estimated_minutes: number
  due_date: string | null
  status: TaskStatus
  tags: string[]
  contact_persons: string[]
  project: string | null
  parent_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TaskChat {
  id: string
  user_id: string
  item_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface TaskActionConfig {
  icon: string
  label: string
  color: string
  bg: string
}

export interface TaskTagStyle {
  color: string
  bg: string
}
