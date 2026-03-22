'use client'

import { useEffect, useState, useCallback } from 'react'
import AuthGuard from '@/components/layout/AuthGuard'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import type { TaskItem } from '@/lib/types'

import TaskHeader from '@/components/tasks/TaskHeader'
import TaskHero from '@/components/tasks/TaskHero'
import StaleAlert from '@/components/tasks/StaleAlert'
import TagSummary from '@/components/tasks/TagSummary'
import TaskTabs from '@/components/tasks/TaskTabs'
import TaskListPane from '@/components/tasks/TaskListPane'
import GanttChart from '@/components/tasks/GanttChart'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import StalePane from '@/components/tasks/StalePane'
import TrashPane from '@/components/tasks/TrashPane'
import BrainDumpModal from '@/components/tasks/BrainDumpModal'
import ShortcutsOverlay from '@/components/tasks/ShortcutsOverlay'

export default function TasksPage() {
  return (
    <AuthGuard>
      <TasksContent />
    </AuthGuard>
  )
}

function TasksContent() {
  // showToast imported directly from Toast module
  const [items, setItems] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'gantt' | 'kanban' | 'stale' | 'trash'>('list')
  const [currentView, setCurrentView] = useState<'all' | 'done'>('all')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [northStar, setNorthStar] = useState('BLUEVOXセッションを5人に届けてPMFの種を掴む')
  const [showBrainDump, setShowBrainDump] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ─── Supabase: FETCH ───
  const fetchItems = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
    if (!error && data) setItems(data as TaskItem[])
    setLoading(false)
  }, [])

  // ─── Supabase: 北極星をapp_settingsから取得 ───
  const fetchNorthStar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('app_settings')
      .select('settings')
      .eq('user_id', session.user.id)
      .single()
    if (data?.settings?.north_star) {
      setNorthStar(data.settings.north_star as string)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    fetchNorthStar()
  }, [fetchItems, fetchNorthStar])

  // ─── Supabase: ADD ───
  const addItem = async (item: Partial<TaskItem>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase
      .from('items')
      .insert({ ...item, user_id: session.user.id })
      .select()
      .single()
    if (!error && data) {
      setItems(prev => [data as TaskItem, ...prev])
      showToast(`+ 追加「${(data as TaskItem).title.substring(0, 18)}…」`, 'success')
    }
  }

  // ─── Supabase: UPDATE ───
  const updateItem = async (id: string, updates: Partial<TaskItem>) => {
    const { error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
    if (!error) {
      setItems(prev => prev.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    }
  }

  // ─── SOFT DELETE ───
  const softDeleteItem = async (id: string) => {
    const task = items.find(t => t.id === id)
    await updateItem(id, { status: 'deleted' })
    if (task) showToast(`🗑 ゴミ箱「${task.title.substring(0, 18)}…」`, 'info')
  }

  // ─── COMPLETE/UNCOMPLETE ───
  const toggleDone = async (id: string) => {
    const task = items.find(t => t.id === id)
    if (!task) return
    const newStatus = task.status === 'done' ? 'today' : 'done'
    await updateItem(id, { status: newStatus })
    if (newStatus === 'done') {
      showToast(`✓ 完了「${task.title.substring(0, 18)}…」`, 'success')
    } else {
      showToast(`↩ 復活「${task.title.substring(0, 18)}…」`, 'info')
    }
  }

  // ─── PROMOTE TO FOCUS ───
  const promoteToFocus = async (id: string) => {
    const task = items.find(t => t.id === id)
    if (!task) return
    await updateItem(id, { status: 'today', priority: Math.max(task.priority, 2) as 0|1|2|3 })
    showToast(`🎯 フォーカス「${task.title.substring(0, 18)}…」`, 'info')
  }

  // ─── START TASK ───
  const startTask = async (id: string) => {
    await updateItem(id, { status: 'in_progress' })
    const task = items.find(t => t.id === id)
    if (task) showToast(`▶ 開始「${task.title.substring(0, 18)}…」`, 'info')
  }

  // ─── KEYBOARD SHORTCUTS ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target?.closest('input, textarea, [contenteditable]')
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('task-add-input')?.focus()
        return
      }
      if (!isTyping) {
        if (e.key === '1') setActiveTab('list')
        if (e.key === '2') setActiveTab('gantt')
        if (e.key === '3') setActiveTab('kanban')
        if (e.key === '4') setActiveTab('stale')
        if (e.key === '5') setActiveTab('trash')
        if (e.key === 'b' || e.key === 'B') setShowBrainDump(true)
        if (e.key === '?') setShowShortcuts(v => !v)
      }
      if (e.key === 'Escape') {
        setShowBrainDump(false)
        setShowShortcuts(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFD]">
        <div className="flex flex-col items-center gap-4">
          <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p className="text-sm text-[#64748b]">読み込み中…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFD]">
      <TaskHeader onShowShortcuts={() => setShowShortcuts(true)} />
      <div className="max-w-[1100px] mx-auto px-6 pb-10" style={{ paddingTop: 72 }}>
        <TaskHero items={items} northStar={northStar} onEditNorthStar={setNorthStar} />
        <StaleAlert items={items} onGoToStale={() => setActiveTab('stale')} />
        <TagSummary items={items} filterTag={filterTag} onFilterTag={setFilterTag} />
        <TaskTabs activeTab={activeTab} onChangeTab={setActiveTab} items={items} />

        {activeTab === 'list' && (
          <TaskListPane
            items={items}
            currentView={currentView}
            filterTag={filterTag}
            onSetView={setCurrentView}
            onToggleDone={toggleDone}
            onPromoteToFocus={promoteToFocus}
            onStartTask={startTask}
            onAddItem={addItem}
            onOpenBrainDump={() => setShowBrainDump(true)}
            onUpdateItem={updateItem}
            onSoftDelete={softDeleteItem}
          />
        )}
        {activeTab === 'gantt' && <GanttChart items={items} />}
        {activeTab === 'kanban' && <KanbanBoard items={items} onToggleDone={toggleDone} />}
        {activeTab === 'stale' && <StalePane items={items} onToggleDone={toggleDone} />}
        {activeTab === 'trash' && (
          <TrashPane
            items={items}
            onRestore={async (id) => {
              await updateItem(id, { status: 'inbox' })
              showToast('↩ 復活しました', 'info')
            }}
            onPermanentDelete={async (id) => {
              await supabase.from('items').delete().eq('id', id)
              setItems(prev => prev.filter(t => t.id !== id))
              showToast('完全に削除しました', 'error')
            }}
          />
        )}
      </div>

      {showBrainDump && (
        <BrainDumpModal
          onClose={() => setShowBrainDump(false)}
          onAddItems={(newItems) => {
            newItems.forEach(item => addItem(item))
          }}
        />
      )}
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
