'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { ACTION_TYPES, PRIORITY_CONFIG, getTagStyle } from '@/lib/tasks/constants'
import { fmtMin, fmtDue, isOverdue, isDueToday, isStale, staleDays } from '@/lib/tasks/utils'

interface TaskRowProps {
  task: TaskItem
  onToggleDone: (id: string) => void
  onPromoteToFocus?: (id: string) => void
  onStartTask?: (id: string) => void
  onOpenDetail?: (task: TaskItem) => void
  onSoftDelete?: (id: string) => void
}

export default function TaskRow({ task, onToggleDone, onOpenDetail, onSoftDelete }: TaskRowProps) {
  const [completing, setCompleting] = useState(false)

  const isDone = task.status === 'done'
  const stale = isStale(task)
  const actionConfig = ACTION_TYPES[task.action_type]
  const priConfig = PRIORITY_CONFIG[task.priority]
  const dueStr = fmtDue(task.due_date)
  const overdue = isOverdue(task.due_date) && !isDone
  const dueToday = isDueToday(task.due_date) && !isDone

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDone) {
      setCompleting(true)
      setTimeout(() => {
        onToggleDone(task.id)
        setCompleting(false)
      }, 400)
    } else {
      onToggleDone(task.id)
    }
  }

  const handleRowClick = () => {
    if (onOpenDetail) onOpenDetail(task)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSoftDelete) onSoftDelete(task.id)
  }

  return (
    <div
      className={`flex items-start gap-2.5 rounded-[10px] cursor-pointer transition-all group ${completing ? 'task-completing' : ''}`}
      style={{
        padding: '10px 14px',
        background: isDone ? '#fff' : stale ? '#FAFAFF' : '#fff',
        border: `1px solid ${stale && !isDone ? '#DDD6FE' : 'transparent'}`,
        opacity: isDone ? 0.4 : 1,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F1F5F9'; (e.currentTarget as HTMLDivElement).style.borderColor = '#E8ECF1' }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = isDone ? '#fff' : stale ? '#FAFAFF' : '#fff'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = stale && !isDone ? '#DDD6FE' : 'transparent'
      }}
      onClick={handleRowClick}
    >
      {/* チェックボックス */}
      <div
        onClick={handleCheck}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 22, height: 22,
          border: `2px solid ${isDone ? '#059669' : '#CBD5E1'}`,
          borderRadius: 6,
          background: isDone ? '#059669' : 'transparent',
          color: isDone ? '#fff' : 'transparent',
          fontSize: 11, marginTop: 1, cursor: 'pointer',
          transition: 'all .2s',
        }}
      >
        ✓
      </div>

      {/* 優先度ドット */}
      <div
        className="flex-shrink-0"
        style={{
          width: 8, height: 8, borderRadius: '50%',
          marginTop: 7, flexShrink: 0,
          background: priConfig.color !== 'transparent' ? priConfig.color : 'transparent',
          border: priConfig.color === 'transparent' ? '1px solid #E8ECF1' : 'none',
          boxShadow: task.priority === 3 ? '0 0 4px rgba(220,38,38,.3)' : 'none',
        }}
      />

      {/* 本文 */}
      <div className="flex-1 min-w-0">
        <div
          style={{
            fontSize: 13, fontWeight: 500, color: '#1A1A2E',
            lineHeight: 1.45, marginBottom: 3,
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </div>
        <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: 11, color: '#94A3B8' }}>
          {/* アクションタイプ */}
          <span style={{ fontSize: 9, fontWeight: 600, color: actionConfig.color, background: actionConfig.bg, padding: '1px 7px', borderRadius: 4 }}>
            {actionConfig.icon} {actionConfig.label}
          </span>
          {/* タグ */}
          {task.tags?.map(tag => {
            const s = getTagStyle(tag)
            return (
              <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: s.color, background: s.bg, padding: '1px 7px', borderRadius: 4 }}>
                {tag}
              </span>
            )
          })}
          {/* 放置バッジ */}
          {stale && !isDone && (
            <span style={{ fontSize: 9, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', padding: '1px 7px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              ⏰ <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12 }}>{staleDays(task)}</span>日放置
            </span>
          )}
          {/* 担当者 */}
          {task.contact_persons?.map(p => (
            <span key={p} style={{ fontSize: 10, color: '#1565C0' }}>{p}</span>
          ))}
        </div>
      </div>

      {/* 右側メタ */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ marginTop: 2 }}>
        {dueStr && (
          <span style={{ fontSize: 11, color: overdue ? '#DC2626' : dueToday ? '#D97706' : '#94A3B8', fontWeight: (overdue || dueToday) ? 600 : 400, whiteSpace: 'nowrap' }}>
            {dueStr}
          </span>
        )}
        {task.estimated_minutes > 0 && (
          <span style={{ fontSize: 11, color: '#1565C0', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {fmtMin(task.estimated_minutes)}
          </span>
        )}
        {/* 削除ボタン（ホバー時表示） */}
        {onSoftDelete && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100"
            style={{
              fontSize: 12, color: '#CBD5E1', cursor: 'pointer',
              background: 'none', border: 'none', padding: '2px 4px', borderRadius: 4,
              transition: 'opacity .15s, color .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#DC2626' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#CBD5E1' }}
            title="ゴミ箱へ"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}
