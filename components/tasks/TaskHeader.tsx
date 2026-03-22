'use client'

interface TaskHeaderProps {
  onShowShortcuts: () => void
}

export default function TaskHeader({ onShowShortcuts }: TaskHeaderProps) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short'
  })

  return (
    <header className="task-page-header">
      <div
        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, letterSpacing: 2, color: '#1A1A2E' }}
      >
        <span style={{ color: '#1565C0' }}>BLUE</span>VOX
      </div>
      <div className="flex items-center gap-2.5">
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{dateStr}</span>
        <button
          onClick={onShowShortcuts}
          style={{
            fontSize: 10, color: '#CBD5E1', cursor: 'pointer',
            padding: '4px 8px', border: '1px solid #E8ECF1', borderRadius: 5,
            background: 'transparent', transition: 'all .2s',
          }}
          title="キーボードショートカット"
        >
          ⌘K
        </button>
      </div>
    </header>
  )
}
