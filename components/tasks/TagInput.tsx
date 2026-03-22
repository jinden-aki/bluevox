'use client'

import { useState, useRef, useEffect } from 'react'
import type { TaskItem } from '@/lib/types'
import { getTagStyle, TAG_COLORS } from '@/lib/tasks/constants'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  allTasks: TaskItem[]
}

export default function TagInput({ tags, onChange, allTasks }: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSug, setShowSug] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 全タスクから既存タグを収集
  const allExistingTags = Array.from(
    new Set([
      ...Object.keys(TAG_COLORS),
      ...allTasks.flatMap(t => t.tags || []),
    ])
  ).filter(t => !tags.includes(t))

  const filterSuggestions = (val: string) => {
    if (!val.trim()) return allExistingTags.slice(0, 8)
    return allExistingTags.filter(t => t.toLowerCase().includes(val.toLowerCase())).slice(0, 8)
  }

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
    }
    setInput('')
    setSuggestions([])
    setShowSug(false)
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    setSuggestions(filterSuggestions(val))
    setShowSug(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (input.trim()) addTag(input)
      else if (suggestions.length > 0) addTag(suggestions[0])
    }
    if (e.key === 'Escape') setShowSug(false)
  }

  // 外クリックでサジェストを閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.tag-input-wrap')) setShowSug(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="tag-input-wrap" style={{ position: 'relative' }}>
      <div
        className="flex flex-wrap gap-1 items-center"
        style={{ border: '1px solid #E8ECF1', borderRadius: 8, padding: '6px 8px', background: '#fff', minHeight: 36 }}
        onClick={() => { inputRef.current?.focus(); setSuggestions(filterSuggestions(input)); setShowSug(true) }}
      >
        {tags.map(tag => {
          const s = getTagStyle(tag)
          return (
            <span
              key={tag}
              style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: '2px 8px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              {tag}
              <button
                onClick={e => { e.stopPropagation(); removeTag(tag) }}
                style={{ fontSize: 10, color: s.color, cursor: 'pointer', background: 'none', border: 'none', padding: 0, opacity: 0.7, lineHeight: 1 }}
              >×</button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setSuggestions(filterSuggestions(input)); setShowSug(true) }}
          placeholder={tags.length === 0 ? 'タグを追加…' : ''}
          style={{ fontSize: 12, border: 'none', outline: 'none', background: 'transparent', color: '#1A1A2E', minWidth: 80, flex: 1 }}
        />
      </div>

      {/* サジェストドロップダウン */}
      {showSug && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: '#fff', border: '1px solid #E8ECF1', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,.08)', marginTop: 4, overflow: 'hidden',
          }}
        >
          {suggestions.map(tag => {
            const s = getTagStyle(tag)
            return (
              <button
                key={tag}
                onMouseDown={e => { e.preventDefault(); addTag(tag) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 12px', cursor: 'pointer',
                  background: 'none', border: 'none', textAlign: 'left',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFD' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#1A1A2E' }}>{tag}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
