'use client'

import type { TaskItem } from '@/lib/types'
import { isStale } from '@/lib/tasks/utils'

interface StaleAlertProps {
  items: TaskItem[]
  onGoToStale: () => void
}

export default function StaleAlert({ items, onGoToStale }: StaleAlertProps) {
  const staleItems = items.filter(isStale)
  if (staleItems.length === 0) return null

  return (
    <div
      className="flex items-center gap-2.5 mb-4 task-slide-up"
      style={{
        padding: '10px 16px', borderRadius: 10, fontSize: 12,
        border: '1px solid #C4B5FD',
        background: 'linear-gradient(135deg,#F5F3FF,#EDE9FE)',
        color: '#5B21B6',
        animationDelay: '.1s',
      }}
    >
      <div
        style={{
          minWidth: 22, height: 22, borderRadius: 11,
          background: '#7C3AED', color: '#fff',
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 6px',
          fontFamily: "'Cormorant Garamond', serif",
        }}
      >
        {staleItems.length}
      </div>
      <span>
        件のタスクが24時間以上放置されています。
      </span>
      <button
        onClick={onGoToStale}
        style={{
          marginLeft: 'auto', color: '#7C3AED', background: 'none',
          border: '1px solid #C4B5FD', borderRadius: 6,
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          padding: '4px 10px', transition: 'all .2s',
        }}
      >
        確認する →
      </button>
    </div>
  )
}
