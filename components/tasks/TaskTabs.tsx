'use client'

import type { TaskItem } from '@/lib/types'
import { isStale } from '@/lib/tasks/utils'

type Tab = 'list' | 'gantt' | 'kanban' | 'stale' | 'trash'

interface TaskTabsProps {
  activeTab: Tab
  onChangeTab: (tab: Tab) => void
  items: TaskItem[]
}

export default function TaskTabs({ activeTab, onChangeTab, items }: TaskTabsProps) {
  const active = items.filter(t => t.status !== 'done' && t.status !== 'deleted' && !t.parent_id).length
  const staleCount = items.filter(t => isStale(t) && t.status !== 'deleted').length
  const trashCount = items.filter(t => t.status === 'deleted' && !t.parent_id).length

  const tabs: { key: Tab; label: string; count?: number; kbd: string }[] = [
    { key: 'list',   label: 'リスト',       count: active,      kbd: '1' },
    { key: 'gantt',  label: 'ガント',                           kbd: '2' },
    { key: 'kanban', label: 'かんばん',                         kbd: '3' },
    { key: 'stale',  label: '放置タスク',    count: staleCount,  kbd: '4' },
    { key: 'trash',  label: 'ゴミ箱',        count: trashCount,  kbd: '5' },
  ]

  const badgeBg: Record<Tab, string> = {
    list:   '#1565C0',
    gantt:  '#94A3B8',
    kanban: '#94A3B8',
    stale:  '#7C3AED',
    trash:  '#DC2626',
  }

  return (
    <div
      className="flex mb-4"
      style={{ borderBottom: '1.5px solid #E8ECF1', position: 'relative' }}
    >
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChangeTab(tab.key)}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: activeTab === tab.key ? 600 : 500,
            color: activeTab === tab.key ? '#1565C0' : '#94A3B8',
            cursor: 'pointer',
            borderBottom: `2.5px solid ${activeTab === tab.key ? '#1565C0' : 'transparent'}`,
            marginBottom: -1.5,
            transition: 'all .2s cubic-bezier(.4,0,.2,1)',
            background: 'none',
            border: 'none',
            borderBottomStyle: 'solid',
            borderBottomWidth: 2.5,
            borderBottomColor: activeTab === tab.key ? '#1565C0' : 'transparent',
            userSelect: 'none',
          }}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span
              style={{
                fontSize: 10, fontWeight: 700, color: '#fff',
                padding: '1px 7px', borderRadius: 9, marginLeft: 4,
                verticalAlign: 1, fontFamily: "'Cormorant Garamond', serif",
                background: badgeBg[tab.key],
              }}
            >
              {tab.count}
            </span>
          )}
          <span style={{ fontSize: 9, color: '#CBD5E1', marginLeft: 2, fontWeight: 400 }}>
            {tab.kbd}
          </span>
        </button>
      ))}
    </div>
  )
}
