export type ActionType = 'do' | 'contact' | 'decide' | 'errand';
export type TimeSlot = 'morning' | 'afternoon' | 'anytime';
export type PriorityLevel = 'high' | 'medium' | 'low';

export const ACTION_TYPE_CONFIG: Record<ActionType, { icon: string; label: string; color: string; bg: string }> = {
  do:      { icon: '💼', label: '手を動かす', color: '#1565C0', bg: '#E3F2FD' },
  contact: { icon: '✉️', label: '連絡する',   color: '#7C3AED', bg: '#F5F3FF' },
  decide:  { icon: '🤔', label: '判断する',   color: '#E65100', bg: '#FFF3E0' },
  errand:  { icon: '🏃', label: '手続き',     color: '#059669', bg: '#ECFDF5' },
};

export const ACTION_TYPE_ORDER: ActionType[] = ['do', 'contact', 'decide', 'errand'];

export const PRIORITY_INT_MAP: Record<number, { dot: string; color: string; label: string }> = {
  3: { dot: '🔴', color: '#DC2626', label: '高' },
  2: { dot: '🟡', color: '#D97706', label: '中' },
  1: { dot: '',   color: '',        label: '低' },
  0: { dot: '',   color: '',        label: '' },
};

export function priorityTextToInt(text: string): number {
  switch (text) {
    case 'high':   return 3;
    case 'medium': return 2;
    case 'low':    return 1;
    default:       return 0;
  }
}

export function priorityIntToText(num: number): PriorityLevel {
  if (num >= 3) return 'high';
  if (num >= 2) return 'medium';
  return 'low';
}

export function statusFromAI(aiStatus: string): string {
  switch (aiStatus) {
    case 'today':     return 'today';
    case 'this_week': return 'this_week';
    default:          return 'inbox';
  }
}

export interface ParsedTask {
  title: string;
  status: string;
  action_type: ActionType;
  priority: PriorityLevel;
  time_slot: TimeSlot;
  due: string | null;
  estimated_minutes: number | null;
  contact_persons: string[];
  sub_category: string | null;
  notes: string | null;
  project: string | null;
  checked: boolean; // UI state for preview
}

export interface ParsedStock {
  title: string;
  url: string | null;
  source: string | null;
  tags: string[];
  memo: string | null;
  project: string | null;
  checked: boolean;
}

export interface ParsedSpark {
  title: string;
  body: string;
  tags: string[];
  project: string | null;
  twin_candidate: boolean;
  checked: boolean;
}

export type ParsedItem =
  | ({ itemType: 'task' } & ParsedTask)
  | ({ itemType: 'stock' } & ParsedStock)
  | ({ itemType: 'spark' } & ParsedSpark);
