'use client';

export type TaskTab = 'dashboard' | 'list' | 'ball' | 'kanban' | 'stale' | 'trash';

interface TaskTabsProps {
  activeTab: TaskTab;
  onChange: (tab: TaskTab) => void;
  ballCount?: number;
  staleCount?: number;
}

const TABS: { id: TaskTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'ダッシュボード', icon: '🌅' },
  { id: 'list',      label: 'タスク一覧',     icon: '📋' },
  { id: 'ball',      label: '相手ボール',      icon: '🏀' },
  { id: 'kanban',    label: 'カンバン',        icon: '🗂️' },
  { id: 'stale',     label: '放置中',          icon: '💤' },
  { id: 'trash',     label: 'ゴミ箱',          icon: '🗑️' },
];

export default function TaskTabs({ activeTab, onChange, ballCount = 0, staleCount = 0 }: TaskTabsProps) {
  return (
    <div className="hidden md:flex gap-1 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto scrollbar-none">
      {TABS.map(tab => {
        const count =
          tab.id === 'ball' ? ballCount :
          tab.id === 'stale' ? staleCount : 0;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap
              transition-colors min-h-[32px]
              ${activeTab === tab.id
                ? 'bg-jinden-blue text-white'
                : 'text-gray-500 hover:bg-gray-100'}
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {count > 0 && (
              <span className={`
                ml-0.5 text-[10px] px-1 rounded-full font-bold
                ${activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
