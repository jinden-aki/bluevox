import type { ActionType, TaskPriority } from '@/lib/types'
import { detectActionType } from './utils'

interface ParseResult {
  title: string
  tags: string[]
  priority: TaskPriority
  estimated_minutes: number
  due_date: string | null
  action_type: ActionType
}

export function parseTaskInput(text: string): ParseResult {
  let c = text
  const tags: string[] = []
  let pri: TaskPriority = 2
  let mins = 60
  let due: string | null = null

  // #tags
  c = c.replace(/#(\S+)/g, (_, t) => { tags.push(t); return '' }).trim()

  // priority p0-p3
  const pm = c.match(/\bp([0-3])\b/i)
  if (pm) { pri = +pm[1] as TaskPriority; c = c.replace(pm[0], '').trim() }

  // time @30m or @2h
  const tm = c.match(/@(\d+)(h|m)/i)
  if (tm) {
    mins = tm[2].toLowerCase() === 'h' ? +tm[1] * 60 : +tm[1]
    c = c.replace(tm[0], '').trim()
  }

  // date: 今日 / 明日 / M/D
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (c.includes('今日')) {
    due = today.toISOString().split('T')[0]
    c = c.replace('今日', '').trim()
  } else if (c.includes('明日')) {
    const tom = new Date(today.getTime() + 86400000)
    due = tom.toISOString().split('T')[0]
    c = c.replace('明日', '').trim()
  } else {
    const dm = c.match(/(\d{1,2})\/(\d{1,2})/)
    if (dm) {
      due = `${today.getFullYear()}-${String(dm[1]).padStart(2, '0')}-${String(dm[2]).padStart(2, '0')}`
      c = c.replace(dm[0], '').trim()
    }
  }

  const title = c.replace(/\s+/g, ' ').trim()
  const action_type = detectActionType(title)

  return { title, tags, priority: pri, estimated_minutes: mins, due_date: due, action_type }
}
