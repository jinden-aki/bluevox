'use client';

interface TaskHeaderProps {
  onOpenDump: () => void;
  onOpenReview: () => void;
}

export default function TaskHeader({ onOpenDump, onOpenReview }: TaskHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
      <div>
        <h1 className="text-[16px] font-semibold text-ink">タスク</h1>
        <p className="text-[11px] text-gray-400 font-serif">
          🎯 BLUEVOXセッションを5人に届ける
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenReview}
          className="text-[12px] text-gray-500 hover:text-ink px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          📝 振り返り
        </button>
        <button
          onClick={onOpenDump}
          className="text-[12px] text-white bg-jinden-blue hover:bg-jinden-blue/90 px-3 py-1.5 rounded-lg transition-colors"
        >
          ☰ ブレインダンプ
        </button>
      </div>
    </div>
  );
}
