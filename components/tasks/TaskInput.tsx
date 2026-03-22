'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { parseTaskInput } from '@/lib/tasks/parser'
import { ACTION_TYPES } from '@/lib/tasks/constants'
import { getTagStyle } from '@/lib/tasks/constants'

interface TaskInputProps {
  onAddItem: (item: Partial<TaskItem>) => void
  onOpenBrainDump: () => void
}

export default function TaskInput({ onAddItem, onOpenBrainDump }: TaskInputProps) {
  const [value, setValue] = useState('')

  const parsed = value.trim() ? parseTaskInput(value) : null
  const actionConfig = parsed ? ACTION_TYPES[parsed.action_type] : null

  const handleSubmit = () => {
    if (!parsed || !parsed.title) return
    onAddItem({
      title: parsed.title,
      action_type: parsed.action_type,
      priority: parsed.priority,
      estimated_minutes: parsed.estimated_minutes,
      due_date: parsed.due_date,
      status: 'inbox',
      tags: parsed.tags,
      contact_persons: [],
      project: null,
    })
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div
      className="flex items-center gap-2 mb-4"
      style={{
        padding: '10px 14px',
        background: '#fff',
        border: '1.5px solid #E8ECF1',
        borderRadius: 10,
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
        transition: 'all .2s',
      }}
      onFocus={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#1565C0'
        el.style.boxShadow = '0 0 0 3px rgba(21,101,192,.08)'
      }}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = '#E8ECF1'
          el.style.boxShadow = '0 1px 2px rgba(0,0,0,.04)'
        }
      }}
    >
      {/* アイコン（アクションタイプ表示） */}
      <span style={{ fontSize: 14, color: '#94A3B8', flexShrink: 0, width: 20 }}>
        {actionConfig ? actionConfig.icon : '＋'}
      </span>

      {/* 入力フィールド */}
      <input
        id="task-add-input"
        type="text"
        placeholder="タスクを追加… (#タグ @2h p2 今日)"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1, border: 'none', outline: 'none',
          fontSize: 13, fontFamily: 'inherit', color: '#1A1A2E',
          background: 'transparent',
        }}
      />

      {/* パース結果プレビュー */}
      {parsed && parsed.title && (
        <div className="flex gap-1 flex-shrink-0 flex-wrap">
          {parsed.tags.map(tag => {
            const style = getTagStyle(tag)
            return (
              <span
                key={tag}
                style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 4,
                  fontWeight: 600, whiteSpace: 'nowrap',
                  color: style.color, background: style.bg,
                }}
              >
                #{tag}
              </span>
            )
          })}
          {actionConfig && (
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, color: actionConfig.color, background: actionConfig.bg }}>
              {actionConfig.icon} {actionConfig.label}
            </span>
          )}
        </div>
      )}

      {/* 脳内吐き出しボタン */}
      <button
        onClick={onOpenBrainDump}
        title="脳内吐き出し (B)"
        style={{
          width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#94A3B8',
          background: 'transparent', border: 'none', transition: 'all .2s', flexShrink: 0,
        }}
      >
        🧠
      </button>

      {/* 送信ボタン */}
      <button
        onClick={handleSubmit}
        disabled={!parsed?.title}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: parsed?.title ? '#1565C0' : '#CBD5E1',
          color: '#fff', border: 'none', cursor: parsed?.title ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .25s ease', flexShrink: 0, fontSize: 15,
        }}
      >
        ↑
      </button>
    </div>
  )
}
