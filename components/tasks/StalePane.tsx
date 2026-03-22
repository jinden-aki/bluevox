'use client'

import type { TaskItem } from '@/lib/types'
import { isStale, staleDays, fmtMin } from '@/lib/tasks/utils'
import { ACTION_TYPES, getTagStyle } from '@/lib/tasks/constants'

interface StalePaneProps {
  items: TaskItem[]
  onToggleDone: (id: string) => void
}

export default function StalePane({ items, onToggleDone }: StalePaneProps) {
  const staleItems = items.filter(isStale).sort((a, b) => {
    // 古い順
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  })

  if (staleItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🌿</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>放置タスクなし</div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>全タスクが24時間以内に更新されています</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4" style={{ fontSize: 12, color: '#5B21B6' }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#7C3AED' }}>
          {staleItems.length}
        </span>
        件のタスクが放置されています。決断・完了・削除してください。
      </div>

      <div className="flex flex-col gap-1.5">
        {staleItems.map(task => {
          const config = ACTION_TYPES[task.action_type]
          const days = staleDays(task)

          return (
            <div
              key={task.id}
              className="flex items-start gap-3"
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg,#FAFAFF,#fff)',
                border: '1px solid #DDD6FE',
                borderRadius: 10,
              }}
            >
              {/* 放置日数バッジ */}
              <div style={{
                minWidth: 42, height: 42, borderRadius: 10,
                background: '#F5F3FF', border: '1px solid #DDD6FE',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>
                  {days}
                </span>
                <span style={{ fontSize: 8, color: '#7C3AED', fontWeight: 600 }}>日</span>
              </div>

              {/* 本文 */}
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E', marginBottom: 4, lineHeight: 1.45 }}>
                  {task.title}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 11, color: '#94A3B8' }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: config.color, background: config.bg, padding: '1px 7px', borderRadius: 4 }}>
                    {config.icon} {config.label}
                  </span>
                  {task.tags?.map(tag => {
                    const s = getTagStyle(tag)
                    return <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: s.color, background: s.bg, padding: '1px 7px', borderRadius: 4 }}>{tag}</span>
                  })}
                  {task.estimated_minutes > 0 && <span>{fmtMin(task.estimated_minutes)}</span>}
                </div>
              </div>

              {/* 完了ボタン */}
              <button
                onClick={() => onToggleDone(task.id)}
                style={{
                  padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', background: '#059669', color: '#fff', border: 'none',
                  flexShrink: 0, transition: 'all .2s',
                }}
              >
                完了
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
