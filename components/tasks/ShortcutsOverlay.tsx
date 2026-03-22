'use client';

interface ShortcutsOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '?', description: 'ショートカット一覧を表示' },
  { key: 'N', description: '新規タスクを追加 (QuickCapture)' },
  { key: 'D', description: 'ブレインダンプを開く' },
  { key: '1', description: 'ダッシュボード' },
  { key: '2', description: 'タスク一覧' },
  { key: '3', description: '相手ボール' },
  { key: '4', description: 'カンバン' },
  { key: 'Esc', description: 'モーダルを閉じる' },
];

export default function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-ink">⌨️ キーボードショートカット</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-gray-600">{s.description}</span>
              <kbd className="text-[11px] bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono text-gray-700 flex-shrink-0">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
