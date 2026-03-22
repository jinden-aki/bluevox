'use client'

import { useState } from 'react'
import type { TaskItem } from '@/lib/types'
import { ACTION_TYPES, ACTION_ORDER, getTagStyle } from '@/lib/tasks/constants'
import { sortTasks, fmtMin, fmtDue } from '@/lib/tasks/utils'
import TaskInput from './TaskInput'
import TaskFocus from './TaskFocus'
import TaskRow from './TaskRow'
import TaskDetailModal from './TaskDetailModal'

interface TaskListPaneProps {
  items: TaskItem[]
  currentView: 'all' | 'done'
  filterTag: string | null
  onSetView: (v: 'all' | 'done') => void
  onToggleDone: (id: string) => void
  onPromoteToFocus: (id: string) => void
  onStartTask: (id: string) => void
  onAddItem: (item: Partial<TaskItem>) => void
  onOpenBrainDump: () => void
  onUpdateItem: (id: string, updates: Partial<TaskItem>) => Promise<void>
  onSoftDelete: (id: string) => Promise<void>
}

export default function TaskListPane({
  items, currentView, filterTag,
  onSetView, onToggleDone, onPromoteToFocus, onStartTask,
  onAddItem, onOpenBrainDump, onUpdateItem, onSoftDelete,
}: TaskListPaneProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)

  // フィルタリング（deletedとsubタスクは除外）
  const filtered = items.filter(t => {
    if (t.status === 'deleted') return false
    if (t.parent_id) return false  // サブタスクはリストに表示しない
    if (filterTag && !t.tags?.includes(filterTag)) return false
    if (currentView === 'done') return t.status === 'done'
    return t.status !== 'done'
  })

  const sorted = sortTasks(filtered)

  // フォーカスタスク（today or in_progress で最優先）
  const focusTask = sorted.find(t => t.status === 'today' || t.status === 'in_progress')

  // Next Up（フォーカス以外で this_week / today）
  const nextUp = sorted
    .filter(t => t !== focusTask && (t.status === 'this_week' || t.status === 'today'))
    .slice(0, 2)

  // アクションタイプごとにグループ分け
  const grouped = ACTION_ORDER.reduce((acc, type) => {
    acc[type] = sorted.filter(t => t.action_type === type && t !== focusTask && !nextUp.includes(t))
    return acc
  }, {} as Record<string, TaskItem[]>)

  const toggleCollapse = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const handleDeleteFromModal = async (id: string) => {
    await onSoftDelete(id)
    setSelectedTask(null)
  }

  if (currentView === 'done') {
    return (
      <>
        <div>
          <ViewBar currentView={currentView} onSetView={onSetView} />
          {sorted.length === 0 ? (
            <EmptyState icon="✅" title="完了タスクなし" sub="タスクを完了するとここに表示されます" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {sorted.map(t => (
                <TaskRow
                  key={t.id} task={t}
                  onToggleDone={onToggleDone}
                  onOpenDetail={setSelectedTask}
                  onSoftDelete={onSoftDelete}
                />
              ))}
            </div>
          )}
        </div>
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={onUpdateItem}
          onDelete={handleDeleteFromModal}
          allTasks={items}
        />
      </>
    )
  }

  return (
    <>
      <div>
        <TaskInput onAddItem={onAddItem} onOpenBrainDump={onOpenBrainDump} />
        <ViewBar currentView={currentView} onSetView={onSetView} />

        {sorted.length === 0 ? (
          <EmptyState icon="🎉" title="全タスク完了！" sub="新しいタスクを追加しよう" />
        ) : (
          <>
            {/* フォーカスカード */}
            {focusTask && (
              <TaskFocus task={focusTask} onToggleDone={onToggleDone} onStartTask={onStartTask} />
            )}

            {/* Next Up */}
            {nextUp.length > 0 && (
              <div className="mb-4">
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, fontWeight: 500 }}>
                  Next up
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {nextUp.map(task => (
                    <NextCard
                      key={task.id} task={task}
                      onOpenDetail={setSelectedTask}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* アクショングループ */}
            {ACTION_ORDER.map(type => {
              const group = grouped[type]
              if (!group || group.length === 0) return null
              const config = ACTION_TYPES[type]
              const isCollapsed = collapsed[type]

              return (
                <div key={type} className="mb-4">
                  <div
                    className="flex items-center gap-2 pb-1.5 mb-1.5 cursor-pointer select-none"
                    style={{ transition: 'opacity .2s' }}
                    onClick={() => toggleCollapse(type)}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: config.bg, flexShrink: 0 }}>
                      {config.icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{config.label}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>{group.length}件</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#CBD5E1', transition: 'transform .25s', transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>▾</span>
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-col gap-0.5">
                      {group.map(t => (
                        <TaskRow
                          key={t.id} task={t}
                          onToggleDone={onToggleDone}
                          onPromoteToFocus={onPromoteToFocus}
                          onStartTask={onStartTask}
                          onOpenDetail={setSelectedTask}
                          onSoftDelete={onSoftDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={onUpdateItem}
        onDelete={handleDeleteFromModal}
        allTasks={items}
      />
    </>
  )
}

function ViewBar({ currentView, onSetView }: { currentView: 'all' | 'done'; onSetView: (v: 'all' | 'done') => void }) {
  return (
    <div className="flex gap-1.5 mb-3.5">
      {(['all', 'done'] as const).map(v => (
        <button
          key={v}
          onClick={() => onSetView(v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'all .2s',
            border: `1px solid ${currentView === v ? '#1A1A2E' : '#E8ECF1'}`,
            background: currentView === v ? '#1A1A2E' : '#fff',
            color: currentView === v ? '#fff' : '#94A3B8',
          }}
        >
          {v === 'all' ? '進行中' : '完了済み'}
        </button>
      ))}
    </div>
  )
}

function NextCard({ task, onOpenDetail }: {
  task: TaskItem
  onOpenDetail: (task: TaskItem) => void
}) {
  const config = ACTION_TYPES[task.action_type]
  const dueStr = fmtDue(task.due_date)

  return (
    <div
      className="relative cursor-pointer transition-all"
      style={{ padding: 14, background: '#fff', border: '1px solid #E8ECF1', borderRadius: 10 }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
      onClick={() => onOpenDetail(task)}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '10px 10px 0 0', background: config.color, opacity: .6 }} />
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A2E', lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {task.title}
      </div>
      <div className="flex items-center gap-1" style={{ fontSize: 10, color: '#94A3B8' }}>
        {dueStr && <span>{dueStr}</span>}
        {task.estimated_minutes > 0 && <><span>·</span><span>{fmtMin(task.estimated_minutes)}</span></>}
        {task.tags?.[0] && (() => {
          const s = getTagStyle(task.tags[0])
          return <span style={{ fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 3, color: s.color, background: s.bg }}>{task.tags[0]}</span>
        })()}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#94A3B8' }}>{sub}</div>
    </div>
  )
}
