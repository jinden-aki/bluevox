'use client'

import { useState, useEffect, useRef } from 'react'
import type { TaskItem, ActionType, TaskPriority } from '@/lib/types'
import { ACTION_TYPES } from '@/lib/tasks/constants'
import { showToast } from '@/components/ui/Toast'
import DateTimePicker from './DateTimePicker'
import TagInput from './TagInput'
import SubtaskList from './SubtaskList'
import { buildGoogleCalendarUrl } from '@/lib/tasks/utils'

const ESTIMATED_OPTIONS = [
  { value: 0, label: '未設定' },
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 45, label: '45分' },
  { value: 60, label: '1時間' },
  { value: 90, label: '1時間30分' },
  { value: 120, label: '2時間' },
  { value: 180, label: '3時間' },
  { value: 240, label: '4時間' },
  { value: 480, label: '終日（8h）' },
]

const STATUS_OPTIONS: { value: TaskItem['status']; label: string }[] = [
  { value: 'inbox', label: '📥 未整理' },
  { value: 'this_week', label: '📅 今週やる' },
  { value: 'today', label: '🎯 今日やる' },
  { value: 'in_progress', label: '⚡ 進行中' },
  { value: 'done', label: '✅ 完了' },
]

interface TaskDetailModalProps {
  task: TaskItem | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<TaskItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  allTasks: TaskItem[]
}

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete, allTasks }: TaskDetailModalProps) {
  // showToast imported directly from Toast module
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [estimatedMinutes, setEstimatedMinutes] = useState(0)
  const [actionType, setActionType] = useState<ActionType>('do')
  const [priority, setPriority] = useState<TaskPriority>(0)
  const [tags, setTags] = useState<string[]>([])
  const [contactPersons, setContactPersons] = useState<string[]>([])
  const [contactInput, setContactInput] = useState('')
  const [project, setProject] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<TaskItem['status']>('inbox')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // taskが変わったら状態をリセット
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDueDate(task.due_date)
    setEstimatedMinutes(task.estimated_minutes || 0)
    setActionType(task.action_type)
    setPriority(task.priority)
    setTags(task.tags || [])
    setContactPersons(task.contact_persons || [])
    setContactInput('')
    setProject(task.project || '')
    setNotes(task.notes || '')
    setStatus(task.status)
  }, [task?.id])

  // Escキーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!task) return null

  const isDirty = () =>
    title !== task.title ||
    dueDate !== task.due_date ||
    estimatedMinutes !== (task.estimated_minutes || 0) ||
    actionType !== task.action_type ||
    priority !== task.priority ||
    JSON.stringify(tags) !== JSON.stringify(task.tags || []) ||
    JSON.stringify(contactPersons) !== JSON.stringify(task.contact_persons || []) ||
    project !== (task.project || '') ||
    notes !== (task.notes || '') ||
    status !== task.status

  const handleSave = async () => {
    if (!title.trim()) { showToast('タスク名を入力してください', 'error'); return }
    setSaving(true)
    await onUpdate(task.id, {
      title: title.trim(),
      due_date: dueDate,
      estimated_minutes: estimatedMinutes,
      action_type: actionType,
      priority,
      tags,
      contact_persons: contactPersons,
      project: project || null,
      notes: notes || null,
      status,
    })
    showToast('保存しました', 'success')
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    await onDelete(task.id)
    onClose()
  }

  const addContactPerson = () => {
    const name = contactInput.trim()
    if (name && !contactPersons.includes(name)) {
      setContactPersons(prev => [...prev, name])
    }
    setContactInput('')
  }

  const gcalUrl = buildGoogleCalendarUrl(task)

  // サブタスク（parent_id === task.id のもの）
  const subtasks = allTasks.filter(t => t.parent_id === task.id)

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* パネル（右からスライドイン） */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 overflow-y-auto"
        style={{
          width: 'min(480px, 100vw)',
          background: '#F8FAFD',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.25s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center justify-between sticky top-0 z-10"
          style={{ padding: '14px 20px', background: '#F8FAFD', borderBottom: '1px solid #E8ECF1' }}
        >
          <button
            onClick={onClose}
            style={{ fontSize: 13, color: '#64748B', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← 戻る
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>タスク詳細</span>
          <button
            onClick={handleDelete}
            style={{ fontSize: 16, color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: '4px 6px', borderRadius: 6 }}
            title="ゴミ箱へ"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#DC2626' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8' }}
          >
            🗑
          </button>
        </div>

        {/* 本文 */}
        <div style={{ padding: '20px 20px 100px' }}>
          {/* タスク名 */}
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%', fontSize: 18, fontWeight: 600, color: '#1A1A2E',
              border: 'none', borderBottom: '2px solid #E8ECF1', background: 'transparent',
              outline: 'none', paddingBottom: 8, marginBottom: 20,
              transition: 'border-color .2s',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderBottomColor = '#1565C0' }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderBottomColor = '#E8ECF1' }}
          />

          {/* 期日 */}
          <FieldRow icon="📅" label="期日">
            <DateTimePicker value={dueDate} onChange={setDueDate} />
          </FieldRow>

          {/* Googleカレンダーボタン */}
          {dueDate && (
            <div style={{ marginBottom: 16, marginLeft: 28 }}>
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: '#1565C0', fontWeight: 500,
                  padding: '5px 12px', border: '1px solid #1565C0',
                  borderRadius: 8, textDecoration: 'none', background: '#fff',
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#E3F2FD' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#fff' }}
              >
                📎 Googleカレンダーに追加
              </a>
            </div>
          )}

          {/* 見積時間 */}
          <FieldRow icon="⏱" label="見積">
            <select
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(Number(e.target.value))}
              style={selectStyle}
            >
              {ESTIMATED_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FieldRow>

          {/* ステータス */}
          <FieldRow icon="📌" label="状態">
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskItem['status'])}
              style={selectStyle}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FieldRow>

          {/* アクションタイプ */}
          <FieldRow icon="⚡" label="種別">
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(ACTION_TYPES) as [ActionType, typeof ACTION_TYPES[ActionType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setActionType(key)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    border: `1.5px solid ${actionType === key ? cfg.color : '#E8ECF1'}`,
                    color: actionType === key ? cfg.color : '#94A3B8',
                    background: actionType === key ? cfg.bg : '#fff',
                    transition: 'all .15s',
                  }}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </FieldRow>

          {/* 優先度 */}
          <FieldRow icon="⭐" label="優先">
            <div className="flex gap-2">
              {([0, 1, 2, 3] as TaskPriority[]).map(p => {
                const colors = ['#E8ECF1', '#94A3B8', '#D97706', '#DC2626']
                const labels = ['なし', '低', '中', '高']
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      width: 36, height: 28, borderRadius: 6, cursor: 'pointer',
                      border: `1.5px solid ${priority === p ? colors[p] : '#E8ECF1'}`,
                      background: priority === p ? colors[p] : '#fff',
                      color: priority === p ? (p === 0 ? '#94A3B8' : '#fff') : '#94A3B8',
                      fontSize: 11, fontWeight: 600, transition: 'all .15s',
                    }}
                  >
                    {labels[p]}
                  </button>
                )
              })}
            </div>
          </FieldRow>

          {/* タグ */}
          <FieldRow icon="🏷" label="タグ">
            <TagInput tags={tags} onChange={setTags} allTasks={allTasks} />
          </FieldRow>

          {/* 担当者 */}
          <FieldRow icon="👤" label="担当">
            <div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {contactPersons.map(p => (
                  <span
                    key={p}
                    style={{ fontSize: 11, color: '#1565C0', background: '#E3F2FD', padding: '2px 8px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {p}
                    <button
                      onClick={() => setContactPersons(prev => prev.filter(x => x !== p))}
                      style={{ fontSize: 10, color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={contactInput}
                  onChange={e => setContactInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addContactPerson() } }}
                  placeholder="名前を入力 + Enter"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={addContactPerson} style={smallBtnStyle}>追加</button>
              </div>
            </div>
          </FieldRow>

          {/* プロジェクト */}
          <FieldRow icon="📁" label="PJ">
            <input
              value={project}
              onChange={e => setProject(e.target.value)}
              placeholder="プロジェクト名"
              style={{ ...inputStyle, flex: 1 }}
            />
          </FieldRow>

          {/* サブタスク */}
          <div style={{ marginTop: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ── サブタスク
            </div>
            <SubtaskList
              parentTask={task}
              subtasks={subtasks}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>

          {/* メモ */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ── メモ
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="メモ・備考を入力…"
              rows={4}
              style={{
                width: '100%', fontSize: 13, color: '#1A1A2E',
                border: '1px solid #E8ECF1', borderRadius: 10,
                padding: '10px 12px', background: '#fff', outline: 'none',
                resize: 'vertical', lineHeight: 1.6,
                transition: 'border-color .2s', fontFamily: 'inherit',
              }}
              onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#1565C0' }}
              onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#E8ECF1' }}
            />
          </div>
        </div>

        {/* 保存ボタン（固定フッター） */}
        {isDirty() && (
          <div
            className="fixed bottom-0 right-0"
            style={{
              width: 'min(480px, 100vw)', padding: '14px 20px',
              background: '#F8FAFD', borderTop: '1px solid #E8ECF1',
              display: 'flex', gap: 10,
            }}
          >
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E8ECF1', background: '#fff', fontSize: 13, color: '#64748B', cursor: 'pointer', fontWeight: 500 }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: '10px 0', borderRadius: 10, border: 'none',
                background: saving ? '#94A3B8' : '#1565C0', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                transition: 'background .2s',
              }}
            >
              {saving ? '保存中…' : '保存する'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

function FieldRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div style={{ width: 22, fontSize: 14, flexShrink: 0, paddingTop: 2 }}>{icon}</div>
      <div style={{ width: 42, fontSize: 12, color: '#94A3B8', fontWeight: 500, flexShrink: 0, paddingTop: 6 }}>{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  fontSize: 13, color: '#1A1A2E', border: '1px solid #E8ECF1',
  borderRadius: 8, padding: '6px 10px', background: '#fff', outline: 'none', cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  fontSize: 13, color: '#1A1A2E', border: '1px solid #E8ECF1',
  borderRadius: 8, padding: '6px 10px', background: '#fff', outline: 'none',
}

const smallBtnStyle: React.CSSProperties = {
  fontSize: 12, color: '#1565C0', border: '1px solid #1565C0', borderRadius: 8,
  padding: '6px 12px', background: '#fff', cursor: 'pointer', fontWeight: 500,
  whiteSpace: 'nowrap',
}
