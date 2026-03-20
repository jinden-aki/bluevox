'use client';

import { useState } from 'react';
import { Item } from '@/lib/types';
import { getTagStyle } from '@/lib/tags';

interface TodayOneProps {
  item: Item | null;
  onComplete: (id: string) => void;
  onOpenChat: (item: Item) => void;
}

export default function TodayOne({ item, onComplete, onOpenChat }: TodayOneProps) {
  const [showCheck, setShowCheck] = useState(false);
  const [showTrunkQ, setShowTrunkQ] = useState(false);

  if (!item) {
    return (
      <div className="rounded-xl p-5 md:p-6" style={{ backgroundColor: '#EBF5FB' }}>
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-medium">今日のタスクを設定しましょう</span>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    setShowCheck(true);
    setTimeout(() => {
      setShowCheck(false);
      setShowTrunkQ(true);
    }, 800);
  };

  const handleTrunkAnswer = (_yes: boolean) => {
    setShowTrunkQ(false);
    onComplete(item.id);
  };

  return (
    <div className="rounded-xl p-5 md:p-6 relative overflow-hidden" style={{ backgroundColor: '#EBF5FB' }}>
      {/* Check animation overlay */}
      {showCheck && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-[#2E7D32]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path className="check-anim" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div className="confetti-burst" />
          </div>
        </div>
      )}

      {/* Trunk question overlay */}
      {showTrunkQ && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
          <div className="text-center px-4">
            <p className="text-sm font-medium text-gray-800 mb-4">幹に繋がりましたか？</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handleTrunkAnswer(true)}
                className="px-5 py-2.5 bg-[#2E7D32] text-white rounded-lg text-sm font-medium hover:bg-[#1B5E20] transition min-h-[44px]"
              >
                はい
              </button>
              <button
                onClick={() => handleTrunkAnswer(false)}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition min-h-[44px]"
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">🎯</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-gray-500 font-medium mb-1">今日の1つ</div>
          <h3 className="text-base md:text-lg font-bold text-gray-900 leading-snug">{item.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {item.tags.map(tag => {
              const style = getTagStyle(tag);
              return (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ color: style.color, backgroundColor: style.bg }}
                >
                  #{tag}
                </span>
              );
            })}
            {item.due_date && (
              <span className={`text-[11px] ${new Date(item.due_date) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                期限：{item.due_date}
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleComplete}
              className="px-4 py-2.5 bg-[#2E7D32] text-white rounded-lg text-sm font-medium hover:bg-[#1B5E20] transition flex items-center gap-1.5 min-h-[44px]"
            >
              完了
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => onOpenChat(item)}
              className="px-4 py-2.5 bg-white text-jinden-blue border border-jinden-blue/30 rounded-lg text-sm font-medium hover:bg-mist transition flex items-center gap-1.5 min-h-[44px]"
            >
              AIと壁打ち 💬
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
