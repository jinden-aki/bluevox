'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { ACTION_TYPES } from '@/lib/tasks/constants'
import { isStale } from '@/lib/tasks/utils'

interface GanttChartProps {
  items: TaskItem[]
}

export default function GanttChart({ items }: GanttChartProps) {
  const [mode, setMode] = useState<'week' | 'month'>('week')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = mode === 'week' ? 7 : 30
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i - (mode === 'week' ? 0 : 3))
    return d
  })

  const todayIdx = dates.findIndex(d =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )

  const colW = mode === 'week' ? 64 : 32

  // due_dateがあるアクティブタスク
  const activeTasks = items.filter(t => t.status !== 'done' && t.due_date)

  const activeCount = items.filter(t => t.status !== 'done').length
  const doneCount = items.filter(t => t.status === 'done').length
  const totalMins = items.filter(t => t.status !== 'done').reduce((s, t) => s + (t.estimated_minutes || 0), 0)

  const wkdays = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div style={{ background: '#fff', border: '1px solid #E8ECF1', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid #E8ECF1' }}>
        <h3 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>
          ガントチャート
        </h3>
        <div className="flex gap-0.5">
          {(['week', 'month'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 14px', fontSize: 11, fontWeight: 500,
                border: '1px solid #E8ECF1', background: mode === m ? '#1565C0' : '#fff',
                color: mode === m ? '#fff' : '#94A3B8', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all .2s',
              }}
            >
              {m === 'week' ? '週' : '月'}
            </button>
          ))}
        </div>
      </div>

      {/* 統計 */}
      <div className="flex gap-5" style={{ padding: '10px 18px', background: '#FAFBFD', borderBottom: '1px solid #E8ECF1', fontSize: 11, color: '#94A3B8' }}>
        <span><span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#1A1A2E', marginRight: 2 }}>{activeCount}</span>件進行中</span>
        <span><span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#1A1A2E', marginRight: 2 }}>{doneCount}</span>件完了</span>
        <span><span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#1A1A2E', marginRight: 2 }}>
          {Math.round(totalMins / 60)}h
        </span>残り</span>
      </div>

      {activeTasks.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
          期日が設定されたタスクがありません
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', fontSize: 11 }}>
          {/* 左カラム */}
          <div style={{ borderRight: '1px solid #E8ECF1' }}>
            <div style={{ height: 34, display: 'flex', alignItems: 'center', padding: '0 14px', fontWeight: 600, color: '#94A3B8', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '1px solid #E8ECF1', background: '#FAFBFD' }}>
              タスク
            </div>
            {activeTasks.map(task => {
              const config = ACTION_TYPES[task.action_type]
              return (
                <div key={task.id} style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderBottom: '1px solid #E8ECF1', fontSize: 11, fontWeight: 500, color: '#1A1A2E', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  <span style={{ width: 3, height: 20, borderRadius: 2, flexShrink: 0, background: config.color }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                </div>
              )
            })}
          </div>

          {/* 右カラム（スクロール可） */}
          <div style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
            {/* 日付ヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days}, ${colW}px)`, height: 34, borderBottom: '1px solid #E8ECF1', background: '#FAFBFD' }}>
              {dates.map((d, i) => {
                const isToday = i === todayIdx
                const isWknd = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #E8ECF1', background: isToday ? '#E3F2FD' : undefined, color: isToday ? '#1565C0' : isWknd ? '#CBD5E1' : undefined }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontWeight: isToday ? 700 : 600, lineHeight: 1 }}>
                      {d.getDate()}
                    </span>
                    <span style={{ fontSize: 7, letterSpacing: .5, color: isToday ? '#1565C0' : '#94A3B8' }}>
                      {wkdays[d.getDay()]}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* タスク行 */}
            {activeTasks.map(task => {
              const config = ACTION_TYPES[task.action_type]
              const stale = isStale(task)
              const dueDate = task.due_date ? new Date(task.due_date) : null
              const dueIdx = dueDate ? dates.findIndex(d =>
                d.getFullYear() === dueDate.getFullYear() &&
                d.getMonth() === dueDate.getMonth() &&
                d.getDate() === dueDate.getDate()
              ) : -1

              // バーの位置計算（今日から期日まで）
              const startIdx = Math.max(0, todayIdx)
              const endIdx = dueIdx >= 0 ? dueIdx : -1

              return (
                <div key={task.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${days}, ${colW}px)`, height: 38, borderBottom: '1px solid #E8ECF1', position: 'relative' }}>
                  {dates.map((d, i) => {
                    const isToday = i === todayIdx
                    const isWknd = d.getDay() === 0 || d.getDay() === 6
                    return (
                      <div key={i} style={{ borderRight: '1px solid #E8ECF1', background: isToday ? 'rgba(21,101,192,.03)' : isWknd ? '#FAFBFD' : undefined }} />
                    )
                  })}
                  {/* ガントバー */}
                  {endIdx >= 0 && endIdx >= startIdx && (
                    <div style={{
                      position: 'absolute', top: 7, height: 24, zIndex: 2,
                      left: startIdx * colW + 4,
                      width: (endIdx - startIdx + 1) * colW - 8,
                      borderRadius: 5, background: config.color,
                      display: 'flex', alignItems: 'center', padding: '0 8px',
                      fontSize: 9, fontWeight: 600, color: '#fff',
                      whiteSpace: 'nowrap', overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,.12)',
                      backgroundImage: stale ? 'repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(255,255,255,.18) 3px,rgba(255,255,255,.18) 6px)' : undefined,
                    }}>
                      {task.title.substring(0, 12)}…
                    </div>
                  )}
                  {/* 今日ライン */}
                  {todayIdx >= 0 && (
                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: '#DC2626', zIndex: 3, opacity: .5, left: todayIdx * colW + colW / 2 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
