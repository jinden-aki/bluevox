'use client';

import { useState, useRef } from 'react';
import { Item, ItemStatus } from '@/lib/types';
import { getTagStyle } from '@/lib/tags';
import { ACTION_TYPE_CONFIG, PRIORITY_INT_MAP } from '@/lib/task-config';
import type { ActionType } from '@/lib/task-config';

const COLUMNS: { key: ItemStatus; label: string; headerClass: string }[] = [
  { key: 'inbox', label: '未整理', headerClass: 'bg-gray-200 text-gray-700' },
  { key: 'this_week', label: '今週やる', headerClass: 'bg-blue-100 text-blue-800' },
  { key: 'today', label: '今日やる', headerClass: 'bg-jinden-blue text-white' },
  { key: 'in_progress', label: '進行中', headerClass: 'bg-orange-100 text-orange-800' },
  { key: 'done', label: '完了', headerClass: 'bg-green-100 text-green-800' },
];

interface KanbanBoardProps {
  items: Item[];
  chatCounts: Record<string, number>;
  onStatusChange: (id: string, status: ItemStatus) => void;
  onCardClick: (item: Item) => void;
}

export default function KanbanBoard({ items, chatCounts, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [moveModalItem, setMoveModalItem] = useState<Item | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: ItemStatus) => {
    e.preventDefault();
    if (draggedId) {
      onStatusChange(draggedId, status);
      setDraggedId(null);
    }
  };

  const handleLongPress = (item: Item) => {
    setMoveModalItem(item);
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none"
        style={{ scrollbarWidth: 'thin' }}
      >
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.key);
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-[280px] md:w-0 md:flex-1 snap-start"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className={`rounded-t-lg px-3 py-2 text-xs font-bold tracking-wide ${col.headerClass}`}>
                {col.label}
                <span className="ml-1.5 opacity-70">({colItems.length})</span>
              </div>
              <div className="bg-gray-50/80 rounded-b-lg min-h-[200px] p-2 space-y-2">
                {colItems.map(item => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    isDone={col.key === 'done'}
                    chatCount={chatCounts[item.id] || 0}
                    onDragStart={handleDragStart}
                    onClick={() => onCardClick(item)}
                    onLongPress={() => handleLongPress(item)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Move modal (mobile) */}
      {moveModalItem && (
        <div
          className="fixed inset-0 bg-black/40 z-[200] flex items-end md:hidden"
          onClick={() => setMoveModalItem(null)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-gray-500 mb-1">移動先を選択</div>
            <div className="text-sm font-medium mb-3 truncate">{moveModalItem.title}</div>
            <div className="space-y-1.5">
              {COLUMNS.filter(c => c.key !== moveModalItem.status).map(col => (
                <button
                  key={col.key}
                  onClick={() => {
                    onStatusChange(moveModalItem.id, col.key);
                    setMoveModalItem(null);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2 min-h-[44px]"
                >
                  <span className={`w-3 h-3 rounded-full ${
                    col.key === 'inbox' ? 'bg-gray-400' :
                    col.key === 'this_week' ? 'bg-blue-400' :
                    col.key === 'today' ? 'bg-jinden-blue' :
                    col.key === 'in_progress' ? 'bg-orange-400' :
                    'bg-green-400'
                  }`} />
                  {col.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KanbanCard({
  item,
  isDone,
  chatCount,
  onDragStart,
  onClick,
  onLongPress,
}: {
  item: Item;
  isDone: boolean;
  chatCount: number;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  onLongPress: () => void;
}) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isOverdue = item.due_date && new Date(item.due_date) < new Date(new Date().toDateString());

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(onLongPress, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const actionCfg = ACTION_TYPE_CONFIG[(item.action_type || 'do') as ActionType] || ACTION_TYPE_CONFIG.do;
  const priCfg = PRIORITY_INT_MAP[item.priority] || PRIORITY_INT_MAP[0];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`bg-white rounded-lg border border-gray-200 cursor-pointer hover:shadow-sm transition select-none relative overflow-hidden ${
        isDone ? 'opacity-50' : ''
      }`}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: actionCfg.color }}
      />

      <div className="p-3 pl-4">
        {/* Action type icon */}
        <div className="text-[11px] mb-1">{actionCfg.icon}</div>

        <div className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {priCfg.dot && <span className="text-[10px]">{priCfg.dot}</span>}
          {item.due && (
            <span className="text-[10px] text-gray-500">{item.due}</span>
          )}
          {!item.due && item.due_date && (
            <span className={`text-[10px] ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              {item.due_date.slice(5)}
            </span>
          )}
          {item.tags.map(tag => {
            const style = getTagStyle(tag);
            return (
              <span
                key={tag}
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: style.color }}
                title={`#${tag}`}
              />
            );
          })}
          {chatCount > 0 && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5 ml-auto">
              💬 {chatCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
