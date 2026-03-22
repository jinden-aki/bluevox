import type { TaskItem, ActionType } from '@/lib/types'
import { ACTION_KEYWORDS } from './constants'

export function buildGoogleCalendarUrl(task: TaskItem): string {
  if (!task.due_date) return ''
  const start = new Date(task.due_date)
  const end = new Date(start.getTime() + (task.estimated_minutes || 60) * 60 * 1000)

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const params = new URLSearchParams({
    text: task.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: [
      task.notes || '',
      task.tags?.length ? `タグ: ${task.tags.join(', ')}` : '',
      task.project ? `PJ: ${task.project}` : '',
    ].filter(Boolean).join('\n'),
  })
  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`
}

const DAY_MS = 86400000

export function isSameDay(a: string | Date, b: string | Date): boolean {
  const x = new Date(a), y = new Date(b)
  return x.getFullYear() === y.getFullYear()
    && x.getMonth() === y.getMonth()
    && x.getDate() === y.getDate()
}

export function hoursAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000)
}

export function isStale(task: TaskItem): boolean {
  return task.status !== 'done' && hoursAgo(task.updated_at) >= 24
}

export function staleDays(task: TaskItem): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const updated = new Date(task.updated_at)
  updated.setHours(0, 0, 0, 0)
  return Math.max(1, Math.floor((today.getTime() - updated.getTime()) / DAY_MS))
}

export function isActive(task: TaskItem): boolean {
  return task.status !== 'done'
}

export function fmtMin(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const r = minutes % 60
    return r ? `${h}h${r}m` : `${h}h`
  }
  return `${minutes}m`
}

export function fmtDue(dateStr: string | null): string {
  if (!dateStr) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)

  if (isSameDay(d, today)) return '今日'
  const diff = Math.floor((d.getTime() - today.getTime()) / DAY_MS)
  if (diff === 1) return '明日'
  if (diff < 0) return `${Math.abs(diff)}日超過`
  const wk = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return diff <= 7
    ? `${wk} ${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getMonth() + 1}/${d.getDate()}`
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) < today
}

export function isDueToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  return isSameDay(dateStr, new Date())
}

export function detectActionType(title: string): ActionType {
  for (const [type, keywords] of Object.entries(ACTION_KEYWORDS)) {
    if (keywords.some(kw => title.includes(kw))) return type as ActionType
  }
  return 'do'
}

export function getGreeting(hour: number): { greet: string; getSubFn: string } {
  if (hour < 10) return { greet: 'おはよう、じんでん。', getSubFn: 'morning' }
  if (hour < 14) return { greet: '午前の集中タイム。', getSubFn: 'noon' }
  if (hour < 18) return { greet: '午後、ギアを上げろ。', getSubFn: 'afternoon' }
  return { greet: '今日の振り返り。', getSubFn: 'evening' }
}

export function sortTasks(tasks: TaskItem[]): TaskItem[] {
  const statusOrder: Record<string, number> = {
    today: 0, in_progress: 1, this_week: 2, inbox: 3, done: 4
  }
  return [...tasks].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 3
    const sb = statusOrder[b.status] ?? 3
    if (sa !== sb) return sa - sb
    return b.priority - a.priority
  })
}
