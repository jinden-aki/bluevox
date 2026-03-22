'use client'

import type { TaskItem } from '@/lib/types'
import { getTagStyle } from '@/lib/tasks/constants'
import { fmtMin } from '@/lib/tasks/utils'

interface TagSummaryProps {
  items: TaskItem[]
  filterTag: string | null
  onFilterTag: (tag: string | null) => void
}

export default function TagSummary({ items, filterTag, onFilterTag }: TagSummaryProps) {
  // タグごとに集計
  const tagMap: Record<string, { total: number; done: number; mins: number }> = {}

  for (const item of items) {
    const tags = item.tags?.length ? item.tags : ['その他']
    for (const tag of tags) {
      if (!tagMap[tag]) tagMap[tag] = { total: 0, done: 0, mins: 0 }
      tagMap[tag].total++
      if (item.status === 'done') tagMap[tag].done++
      else tagMap[tag].mins += item.estimated_minutes || 0
    }
  }

  const tags = Object.entries(tagMap).sort((a, b) => b[1].total - a[1].total)
  if (tags.length === 0) return null

  return (
    <div
      className="flex gap-2 mb-4 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {tags.map(([tag, stat]) => {
        const style = getTagStyle(tag)
        const pct = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0
        const isActive = filterTag === tag

        return (
          <div
            key={tag}
            onClick={() => onFilterTag(isActive ? null : tag)}
            className="flex-shrink-0 cursor-pointer transition-all"
            style={{
              padding: '10px 14px',
              background: '#fff',
              border: `1px solid ${isActive ? '#1565C0' : '#E8ECF1'}`,
              borderRadius: 10,
              boxShadow: isActive ? '0 0 0 2px rgba(21,101,192,.12)' : '0 1px 2px rgba(0,0,0,.04)',
              minWidth: 130,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block', width: '100%', height: 3,
                borderRadius: 2, marginBottom: 8,
                background: style.color,
              }}
            />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>{tag}</div>
            <div className="flex items-baseline gap-0.5 mb-1">
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#1A1A2E', lineHeight: 1 }}>
                {stat.total - stat.done}
              </span>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>/{stat.total}</span>
            </div>
            <div style={{ height: 2, background: '#E8ECF1', borderRadius: 1, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: style.color, borderRadius: 1, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 600, color: '#4A4A6A' }}>
                {fmtMin(stat.mins) || '0m'}
              </span>
              {' '}残り
            </div>
          </div>
        )
      })}
    </div>
  )
}
