'use client'

interface ShortcutsOverlayProps {
  onClose: () => void
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], desc: 'タスク入力にフォーカス' },
  { keys: ['1'], desc: 'リストビュー' },
  { keys: ['2'], desc: 'ガントチャート' },
  { keys: ['3'], desc: 'かんばんボード' },
  { keys: ['4'], desc: '放置タスク' },
  { keys: ['B'], desc: '脳内吐き出しモーダル' },
  { keys: ['?'], desc: 'このヘルプを表示/非表示' },
  { keys: ['Esc'], desc: 'モーダルを閉じる' },
]

export default function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', maxWidth: 380, width: '90%' }}>
        <h3 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, marginBottom: 16, color: '#1A1A2E' }}>
          ⌨ キーボードショートカット
        </h3>
        {SHORTCUTS.map((s, i) => (
          <div key={i} className="flex justify-between items-center" style={{ padding: '6px 0', fontSize: 12, color: '#4A4A6A', borderBottom: i < SHORTCUTS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <span>{s.desc}</span>
            <span className="flex gap-0.5">
              {s.keys.map((k, j) => (
                <kbd key={j} style={{ background: '#F8FAFD', border: '1px solid #E8ECF1', borderRadius: 4, padding: '2px 7px', fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>
                  {k}
                </kbd>
              ))}
            </span>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{ marginTop: 16, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #E8ECF1', background: '#F8FAFD', color: '#94A3B8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
