'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { parseTaskInput } from '@/lib/tasks/parser'

interface BrainDumpModalProps {
  onClose: () => void
  onAddItems: (items: Partial<TaskItem>[]) => void
}

export default function BrainDumpModal({ onClose, onAddItems }: BrainDumpModalProps) {
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)

  const handleSubmit = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    setAdding(true)
    const parsed = lines.map(line => {
      const p = parseTaskInput(line)
      return {
        title: p.title || line,
        action_type: p.action_type,
        priority: p.priority,
        estimated_minutes: p.estimated_minutes,
        due_date: p.due_date,
        status: 'inbox' as const,
        tags: p.tags,
        contact_persons: [],
        project: null,
      }
    })
    onAddItems(parsed)
    setAdding(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: 0,
          maxWidth: 520, width: '90%', maxHeight: '80vh',
          overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,.08)',
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between" style={{ padding: '18px 22px', borderBottom: '1px solid #E8ECF1' }}>
          <h3 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>
            🧠 脳内吐き出し
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, border: 'none', background: 'transparent',
              fontSize: 18, color: '#94A3B8', cursor: 'pointer', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* ボディ */}
        <div style={{ padding: 22 }}>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`頭の中にあること全部吐き出して。1行1タスク。\n\n例:\n鈴木さんに連絡 #OMG @30m\n資料作成 p3 今日\nMTG議事録送る #BLUEVOX`}
            style={{
              width: '100%', minHeight: 160,
              border: '1.5px solid #E8ECF1', borderRadius: 10,
              padding: 14, fontFamily: 'inherit', fontSize: 13,
              color: '#1A1A2E', resize: 'vertical', outline: 'none',
              transition: 'border-color .2s', lineHeight: 1.6,
            }}
            onFocus={e => { e.target.style.borderColor = '#1565C0' }}
            onBlur={e => { e.target.style.borderColor = '#E8ECF1' }}
          />
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, lineHeight: 1.5 }}>
            1行1タスク。#タグ、@2h（時間）、p3（優先度）、今日・明日（期日）が使えます。
          </p>
        </div>

        {/* アクション */}
        <div className="flex justify-end gap-2" style={{ padding: '16px 22px', borderTop: '1px solid #E8ECF1' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', background: '#F8FAFD', color: '#94A3B8', border: 'none',
              transition: 'all .2s',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || adding}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: text.trim() && !adding ? 'pointer' : 'default',
              background: text.trim() ? '#1565C0' : '#CBD5E1',
              color: '#fff', border: 'none', transition: 'all .2s',
            }}
          >
            {adding ? '追加中…' : `追加する${text.trim() ? ` (${text.split('\n').filter(l => l.trim()).length}件)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
