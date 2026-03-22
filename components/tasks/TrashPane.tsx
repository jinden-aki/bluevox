'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { ACTION_TYPES, getTagStyle } from '@/lib/tasks/constants'
import { fmtDue, fmtMin } from '@/lib/tasks/utils'

interface TrashPaneProps {
  items: TaskItem[]
  onRestore: (id: string) => Promise<void>
  onPermanentDelete: (id: string) => Promise<void>
}

export default function TrashPane({ items, onRestore, onPermanentDelete }: TrashPaneProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const trashItems = items.filter(t => t.status === 'deleted' && !t.parent_id)

  const handleRestore = async (id: string) => {
    setProcessing(id)
    await onRestore(id)
    setProcessing(null)
  }

  const handlePermanentDelete = async (id: string) => {
    setProcessing(id)
    await onPermanentDelete(id)
    setProcessing(null)
    setConfirmId(null)
  }

  if (trashItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🗑</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>ゴミ箱は空</div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>削除したタスクはここに表示されます</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
        {trashItems.length}件のタスク — 復活または完全削除できます
      </div>

      <div className="flex flex-col gap-0.5">
        {trashItems.map(task => (
          <TrashRow
            key={task.id}
            task={task}
            processing={processing}
            onRestore={handleRestore}
            onConfirmDelete={setConfirmId}
          />
        ))}
      </div>

      {/* 確認モーダル */}
      {confirmId && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
            onClick={() => setConfirmId(null)}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                background: '#fff', borderRadius: 16, padding: '24px 28px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.16)', maxWidth: 380, width: '90%',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E', marginBottom: 8, textAlign: 'center' }}>
                完全に削除しますか？
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}>
                このタスクを完全に削除します。この操作は取り消せません。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmId(null)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    border: '1px solid #E8ECF1', background: '#fff',
                    fontSize: 13, color: '#64748B', cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={() => handlePermanentDelete(confirmId)}
                  disabled={processing === confirmId}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    border: 'none', background: processing === confirmId ? '#94A3B8' : '#DC2626',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: processing === confirmId ? 'default' : 'pointer',
                  }}
                >
                  {processing === confirmId ? '削除中…' : '完全削除'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TrashRow({
  task, processing, onRestore, onConfirmDelete,
}: {
  task: TaskItem
  processing: string | null
  onRestore: (id: string) => void
  onConfirmDelete: (id: string) => void
}) {
  const actionConfig = ACTION_TYPES[task.action_type]
  const dueStr = fmtDue(task.due_date)
  const isProcessing = processing === task.id

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: '#F8FAFD', borderRadius: 10,
        border: '1px solid #E8ECF1', opacity: 0.7,
      }}
    >
      {/* タイトル + メタ */}
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, fontWeight: 500, color: '#64748B', lineHeight: 1.45, marginBottom: 3, textDecoration: 'line-through' }}>
          {task.title}
        </div>
        <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: 11, color: '#94A3B8' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: actionConfig.color, background: actionConfig.bg, padding: '1px 7px', borderRadius: 4 }}>
            {actionConfig.icon} {actionConfig.label}
          </span>
          {task.tags?.map(tag => {
            const s = getTagStyle(tag)
            return (
              <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: s.color, background: s.bg, padding: '1px 7px', borderRadius: 4 }}>
                {tag}
              </span>
            )
          })}
          {dueStr && <span style={{ color: '#94A3B8' }}>{dueStr}</span>}
          {task.estimated_minutes > 0 && <span style={{ color: '#1565C0' }}>{fmtMin(task.estimated_minutes)}</span>}
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onRestore(task.id)}
          disabled={isProcessing}
          style={{
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7,
            border: '1px solid #1565C0', color: '#1565C0', background: '#fff',
            cursor: isProcessing ? 'default' : 'pointer', opacity: isProcessing ? 0.5 : 1,
            transition: 'all .15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!isProcessing) (e.currentTarget as HTMLButtonElement).style.background = '#E3F2FD' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
        >
          ↩ 復活
        </button>
        <button
          onClick={() => onConfirmDelete(task.id)}
          disabled={isProcessing}
          style={{
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7,
            border: '1px solid #E8ECF1', color: '#DC2626', background: '#fff',
            cursor: isProcessing ? 'default' : 'pointer', opacity: isProcessing ? 0.5 : 1,
            transition: 'all .15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!isProcessing) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#DC2626'; (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2' } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8ECF1'; (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
        >
          完全削除
        </button>
      </div>
    </div>
  )
}
