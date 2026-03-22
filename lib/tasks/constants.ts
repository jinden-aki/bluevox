import type { ActionType, TaskActionConfig, TaskTagStyle } from '@/lib/types'

export const ACTION_TYPES: Record<ActionType, TaskActionConfig> = {
  do:      { icon: '💼', label: '手を動かす', color: '#1565C0', bg: '#E3F2FD' },
  contact: { icon: '✉️', label: '連絡する',   color: '#7C3AED', bg: '#F5F3FF' },
  decide:  { icon: '🤔', label: '判断する',   color: '#E65100', bg: '#FFF3E0' },
  errand:  { icon: '🏃', label: '手続き',     color: '#059669', bg: '#ECFDF5' },
}

export const ACTION_ORDER: ActionType[] = ['do', 'contact', 'decide', 'errand']

export const ACTION_KEYWORDS: Record<string, string[]> = {
  contact: ['連絡','共有','送る','打診','報告','伝える','相談','DM','メール','電話','返信','チャット','フィードバック'],
  decide:  ['判断','決める','検討','選ぶ','決定','考える','方針','戦略','選定'],
  errand:  ['手続き','申請','届出','登録','予約','購入','契約','支払','振込','更新'],
}

export const PRIORITY_CONFIG = {
  3: { color: '#DC2626', label: '高' },
  2: { color: '#D97706', label: '中' },
  1: { color: '#94A3B8', label: '低' },
  0: { color: 'transparent', label: '' },
} as const

export const KANBAN_COLS = [
  { key: 'inbox' as const,       label: '📥 未整理' },
  { key: 'this_week' as const,   label: '📅 今週やる' },
  { key: 'today' as const,       label: '🎯 今日やる' },
  { key: 'in_progress' as const, label: '⚡ 進行中' },
  { key: 'done' as const,        label: '✅ 完了' },
]

export const KANBAN_BG: Record<string, string> = {
  inbox:       'bg-gray-100 text-gray-700',
  this_week:   'bg-blue-100 text-blue-800',
  today:       'bg-[#1565C0] text-white',
  in_progress: 'bg-orange-100 text-orange-800',
  done:        'bg-green-100 text-green-800',
}

export const TAG_COLORS: Record<string, TaskTagStyle> = {
  'セッション': { color: '#2E7D32', bg: '#E8F5E9' },
  'SNS':       { color: '#6B4FA0', bg: '#F3E5F5' },
  'アイデア':   { color: '#E65100', bg: '#FFF3E0' },
  'BLUEVOX':   { color: '#1565C0', bg: '#E3F2FD' },
  'LINEヤフー': { color: '#0891B2', bg: '#E0F2F1' },
  'OMG':       { color: '#7C3AED', bg: '#F5F3FF' },
  'イベント':   { color: '#DB2777', bg: '#FCE7F3' },
  '自分の事業': { color: '#92400E', bg: '#FEF3C7' },
}

export function getTagStyle(tag: string): TaskTagStyle {
  return TAG_COLORS[tag] || { color: '#475569', bg: '#F1F5F9' }
}
