'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { fmtMin } from '@/lib/tasks/utils'

interface SubtaskListProps {
  parentTask: TaskItem
  subtasks: TaskItem[]
  onUpdate: (id: string, updates: Partial<TaskItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function SubtaskList({ parentTask, subtasks, onUpdate, onDelete }: SubtaskListProps) {
  // showToast imported directly from Toast module
  const [newTitle, setNewTitle] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [localSubtasks, setLocalSubtasks] = useState<TaskItem[]>(subtasks)

  // subtasksが外から変わった場合に同期
  const merged = subtasks.length > 0 ? subtasks : localSubtasks

  const handleAddSubtask = async () => {
    const title = newTitle.trim()
    if (!title) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('items')
      .insert({
        title,
        user_id: session.user.id,
        parent_id: parentTask.id,
        status: 'inbox',
        action_type: parentTask.action_type,
        priority: 0,
        estimated_minutes: 0,
        tags: [],
        contact_persons: [],
      })
      .select()
      .single()

    if (!error && data) {
      setLocalSubtasks(prev => [...prev, data as TaskItem])
      setNewTitle('')
    }
  }

  const handleToggleSubtask = async (st: TaskItem) => {
    const newStatus = st.status === 'done' ? 'inbox' : 'done'
    await onUpdate(st.id, { status: newStatus })
    setLocalSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, status: newStatus as TaskItem['status'] } : s))
  }

  const handleDeleteSubtask = async (id: string) => {
    await onDelete(id)
    setLocalSubtasks(prev => prev.filter(s => s.id !== id))
  }

  const handleAIDecompose = async () => {
    const apiKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY
    if (!apiKey) { showToast('Claude APIキーが設定されていません', 'error'); return }

    setAiLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `以下のタスクを具体的なサブタスク（5〜8個）に分解してください。各サブタスクに見積時間（分単位の数字）も付けてください。

タスク: ${parentTask.title}

以下のJSON形式で返してください（他のテキストは不要）:
[
  { "title": "サブタスク名", "minutes": 30 },
  ...
]`,
          }],
        }),
      })

      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      const text: string = json.content?.[0]?.text || ''
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Parse error')

      const parsed: { title: string; minutes: number }[] = JSON.parse(match[0])
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const item of parsed) {
        const { data } = await supabase
          .from('items')
          .insert({
            title: item.title,
            user_id: session.user.id,
            parent_id: parentTask.id,
            status: 'inbox',
            action_type: parentTask.action_type,
            priority: 0,
            estimated_minutes: item.minutes || 0,
            tags: [],
            contact_persons: [],
          })
          .select()
          .single()
        if (data) setLocalSubtasks(prev => [...prev, data as TaskItem])
      }
      showToast(`${parsed.length}件のサブタスクを追加しました`, 'success')
    } catch {
      showToast('AI分解に失敗しました', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const displayList = merged.length > 0 ? merged : localSubtasks

  return (
    <div>
      {/* サブタスク一覧 */}
      {displayList.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {displayList.map(st => (
            <SubtaskRow
              key={st.id}
              subtask={st}
              onToggle={() => handleToggleSubtask(st)}
              onDelete={() => handleDeleteSubtask(st.id)}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {/* 追加入力 */}
      <div className="flex gap-1.5 mb-2">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
          placeholder="＋ サブタスクを追加"
          style={{
            flex: 1, fontSize: 12, border: '1px solid #E8ECF1', borderRadius: 8,
            padding: '7px 10px', background: '#fff', outline: 'none', color: '#1A1A2E',
          }}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#1565C0' }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E8ECF1' }}
        />
        <button
          onClick={handleAddSubtask}
          disabled={!newTitle.trim()}
          style={{
            fontSize: 12, padding: '7px 12px', borderRadius: 8, cursor: newTitle.trim() ? 'pointer' : 'default',
            border: '1px solid #1565C0', color: '#1565C0', background: '#fff', fontWeight: 500,
            opacity: newTitle.trim() ? 1 : 0.5, transition: 'all .15s',
          }}
        >
          追加
        </button>
      </div>

      {/* AI分解ボタン */}
      <button
        onClick={handleAIDecompose}
        disabled={aiLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 8,
          border: '1.5px solid #E8ECF1', color: '#64748B', background: aiLoading ? '#F8FAFD' : '#fff',
          cursor: aiLoading ? 'default' : 'pointer', transition: 'all .2s', width: '100%',
          justifyContent: 'center',
        }}
        onMouseEnter={e => { if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#1565C0' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8ECF1' }}
      >
        {aiLoading ? (
          <>
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            AI分解中…
          </>
        ) : '🤖 AIで分解'}
      </button>
    </div>
  )
}

function SubtaskRow({
  subtask, onToggle, onDelete, onUpdate,
}: {
  subtask: TaskItem
  onToggle: () => void
  onDelete: () => void
  onUpdate: (id: string, updates: Partial<TaskItem>) => Promise<void>
}) {
  const isDone = subtask.status === 'done'
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(subtask.title)

  const handleTitleSave = async () => {
    if (editTitle.trim() && editTitle !== subtask.title) {
      await onUpdate(subtask.id, { title: editTitle.trim() })
    } else {
      setEditTitle(subtask.title)
    }
    setEditing(false)
  }

  return (
    <div
      className="flex items-center gap-2 group"
      style={{
        padding: '6px 8px', borderRadius: 8,
        background: isDone ? '#F8FAFD' : '#fff',
        border: '1px solid #E8ECF1',
      }}
    >
      {/* チェック */}
      <div
        onClick={onToggle}
        style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
          border: `1.5px solid ${isDone ? '#059669' : '#CBD5E1'}`,
          background: isDone ? '#059669' : 'transparent',
          color: isDone ? '#fff' : 'transparent',
          fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}
      >
        ✓
      </div>

      {/* タイトル */}
      {editing ? (
        <input
          autoFocus
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditTitle(subtask.title); setEditing(false) } }}
          style={{ flex: 1, fontSize: 12, border: 'none', outline: 'none', background: 'transparent', color: '#1A1A2E' }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            flex: 1, fontSize: 12, color: isDone ? '#94A3B8' : '#1A1A2E',
            textDecoration: isDone ? 'line-through' : 'none',
            cursor: 'text',
          }}
        >
          {subtask.title}
        </span>
      )}

      {/* 見積時間 */}
      {subtask.estimated_minutes > 0 && (
        <span style={{ fontSize: 10, color: '#1565C0', fontWeight: 500, flexShrink: 0 }}>
          {fmtMin(subtask.estimated_minutes)}
        </span>
      )}

      {/* 削除 */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100"
        style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: '0 2px', transition: 'opacity .15s, color .15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#DC2626' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8' }}
      >
        🗑
      </button>
    </div>
  )
}
