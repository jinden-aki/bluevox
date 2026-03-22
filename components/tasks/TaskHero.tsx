'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { getGreeting, fmtMin } from '@/lib/tasks/utils'

interface TaskHeroProps {
  items: TaskItem[]
  northStar: string
  onEditNorthStar: (v: string) => void
}

export default function TaskHero({ items, northStar, onEditNorthStar }: TaskHeroProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(northStar)

  const active = items.filter(t => t.status !== 'done')
  const done = items.filter(t => t.status === 'done')
  const total = items.length
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0
  const totalMins = active.reduce((s, t) => s + (t.estimated_minutes || 0), 0)

  const hour = new Date().getHours()
  const { greet } = getGreeting(hour)

  const circumference = 2 * Math.PI * 29
  const offset = circumference - (pct / 100) * circumference

  const handleNorthSave = () => {
    onEditNorthStar(draft)
    setEditing(false)
  }

  return (
    <div
      className="flex items-center gap-5 p-5 bg-white border border-[#E8ECF1] rounded-[14px] mb-4 shadow-sm task-slide-up"
    >
      {/* 進捗リング */}
      <div className="relative flex-shrink-0" style={{ width: 68, height: 68 }}>
        <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: 'rotate(-90deg)' }}>
          <circle className="ring-bg" cx="34" cy="34" r="29" fill="none" stroke="#E8ECF1" strokeWidth="5" />
          <circle
            className="ring-fill"
            cx="34" cy="34" r="29" fill="none"
            stroke="#059669" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1A1A2E', lineHeight: 1 }}>
            {pct}
          </span>
          <span style={{ fontSize: 8, color: '#94A3B8', fontWeight: 600, letterSpacing: 1 }}>%</span>
        </div>
      </div>

      {/* テキスト */}
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>
          {greet}
        </p>
        <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
          <span style={{ color: '#4A4A6A', fontWeight: 600 }}>{active.length}件</span> 残り ·{' '}
          <span style={{ color: '#4A4A6A', fontWeight: 600 }}>{fmtMin(totalMins) || '0m'}</span> 合計 ·{' '}
          {done.length}件完了
        </p>
      </div>

      {/* 北極星 */}
      <div
        className="flex-shrink-0"
        style={{
          maxWidth: 240, padding: '12px 16px',
          background: 'linear-gradient(135deg,#E3F2FD,#E8EAF6)',
          borderRadius: 10, borderLeft: '3px solid #1565C0',
          cursor: 'pointer', transition: 'all .2s',
        }}
        onClick={() => { setEditing(true); setDraft(northStar) }}
        title="クリックで編集"
      >
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#1565C0', marginBottom: 3 }}>
          NORTH STAR
        </div>
        {editing ? (
          <div onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNorthSave(); if (e.key === 'Escape') setEditing(false) }}
              style={{
                fontSize: 11, fontWeight: 500, color: '#1A1A2E', lineHeight: 1.5,
                border: 'none', outline: 'none', background: 'transparent', width: '100%',
              }}
            />
            <button
              onClick={handleNorthSave}
              style={{ fontSize: 10, color: '#1565C0', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
            >
              保存
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11, fontWeight: 500, color: '#1A1A2E', lineHeight: 1.5 }}>
            {northStar}
          </div>
        )}
      </div>
    </div>
  )
}
