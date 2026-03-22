'use client'

import type { TaskItem } from '@/lib/types'
import { KANBAN_COLS, KANBAN_BG, ACTION_TYPES, getTagStyle } from '@/lib/tasks/constants'
import { fmtMin, fmtDue } from '@/lib/tasks/utils'

interface KanbanBoardProps {
  items: TaskItem[]
  onToggleDone: (id: string) => void
}

export default function KanbanBoard({ items, onToggleDone }: KanbanBoardProps) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
      {KANBAN_COLS.map(col => {
        const colItems = items.filter(t => t.status === col.key)
        const bgClass = KANBAN_BG[col.key]

        return (
          <div key={col.key} style={{ minWidth: 200, flex: 1, background: '#F8FAFD', borderRadius: 10, padding: 8 }}>
            {/* カラムヘッダー */}
            <div className={`${bgClass} mb-2 text-center`} style={{ padding: '8px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, letterSpacing: .5 }}>
              {col.label}
              <span style={{ marginLeft: 6, opacity: .7 }}>({colItems.length})</span>
            </div>

            {/* カード群 */}
            <div className="flex flex-col gap-1.5" style={{ minHeight: 40 }}>
              {colItems.map(task => (
                <KanbanCard key={task.id} task={task} onToggleDone={onToggleDone} />
              ))}
              {colItems.length === 0 && (
                <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11, color: '#CBD5E1' }}>
                  空
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ task, onToggleDone }: { task: TaskItem; onToggleDone: (id: string) => void }) {
  const config = ACTION_TYPES[task.action_type]
  const dueStr = fmtDue(task.due_date)
  const firstTag = task.tags?.[0]
  const tagStyle = firstTag ? getTagStyle(firstTag) : null

  return (
    <div
      onClick={() => onToggleDone(task.id)}
      className="cursor-pointer transition-all"
      style={{ padding: '10px 12px', background: '#fff', border: '1px solid #E8ECF1', borderRadius: 8, fontSize: 11 }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
    >
      <div style={{ fontWeight: 500, color: '#1A1A2E', marginBottom: 4, lineHeight: 1.35 }}>
        {task.title}
      </div>
      <div className="flex gap-1.5 items-center" style={{ fontSize: 9, color: '#94A3B8' }}>
        <span style={{ color: config.color }}>{config.icon}</span>
        {dueStr && <span>{dueStr}</span>}
        {task.estimated_minutes > 0 && <span>{fmtMin(task.estimated_minutes)}</span>}
        {tagStyle && firstTag && (
          <span style={{ fontWeight: 600, padding: '1px 5px', borderRadius: 3, color: tagStyle.color, background: tagStyle.bg }}>
            {firstTag}
          </span>
        )}
      </div>
    </div>
  )
}
