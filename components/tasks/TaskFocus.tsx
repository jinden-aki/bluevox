'use client'

import type { TaskItem } from '@/lib/types'
import { ACTION_TYPES, PRIORITY_CONFIG, getTagStyle } from '@/lib/tasks/constants'
import { fmtMin, fmtDue, isOverdue } from '@/lib/tasks/utils'

interface TaskFocusProps {
  task: TaskItem
  onToggleDone: (id: string) => void
  onStartTask: (id: string) => void
}

export default function TaskFocus({ task, onToggleDone, onStartTask }: TaskFocusProps) {
  const actionConfig = ACTION_TYPES[task.action_type]
  const priConfig = PRIORITY_CONFIG[task.priority]
  const dueStr = fmtDue(task.due_date)
  const overdue = isOverdue(task.due_date)

  return (
    <div
      className="relative overflow-hidden mb-4 task-slide-up"
      style={{
        padding: 22,
        background: '#fff',
        border: '1px solid #E8ECF1',
        borderRadius: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}
    >
      {/* 上部グラデーションライン */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#1565C0,#2196F3)' }} />

      {/* ラベル */}
      <div className="flex items-center gap-1.5 mb-2.5" style={{ fontSize: 10, fontWeight: 600, color: '#1565C0', letterSpacing: 1 }}>
        🎯 今やること
        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, color: actionConfig.color, background: actionConfig.bg }}>
          {actionConfig.icon} {actionConfig.label}
        </span>
        {task.priority >= 2 && (
          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, color: priConfig.color, background: '#fff', border: `1px solid ${priConfig.color}40` }}>
            {priConfig.label}優先
          </span>
        )}
      </div>

      {/* タイトル */}
      <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A2E', marginBottom: 8, lineHeight: 1.45 }}>
        {task.title}
      </div>

      {/* メタ */}
      <div className="flex items-center gap-2.5 flex-wrap mb-4" style={{ fontSize: 12, color: '#94A3B8' }}>
        {dueStr && (
          <span style={{ color: overdue ? '#DC2626' : '#94A3B8', fontWeight: overdue ? 600 : 400 }}>
            📅 {dueStr}
          </span>
        )}
        {task.estimated_minutes > 0 && (
          <><span style={{ color: '#CBD5E1' }}>·</span><span>⏱ {fmtMin(task.estimated_minutes)}</span></>
        )}
        {task.tags?.map(tag => {
          const s = getTagStyle(tag)
          return (
            <><span style={{ color: '#CBD5E1' }}>·</span>
            <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{tag}</span></>
          )
        })}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 flex-wrap">
        {task.status !== 'in_progress' && (
          <button
            onClick={() => onStartTask(task.id)}
            style={{
              padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', background: '#059669', color: '#fff', border: 'none',
              transition: 'all .2s',
            }}
          >
            ▶ 開始する
          </button>
        )}
        <button
          onClick={() => onToggleDone(task.id)}
          style={{
            padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', background: '#F8FAFD', color: '#4A4A6A',
            border: '1px solid #E8ECF1', transition: 'all .2s',
          }}
        >
          ✓ 完了
        </button>
      </div>
    </div>
  )
}
