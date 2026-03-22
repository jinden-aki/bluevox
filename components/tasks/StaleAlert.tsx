'use client';

interface StaleAlertProps {
  count: number;
  onClick: () => void;
}

export default function StaleAlert({ count, onClick }: StaleAlertProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="mx-4 my-2 w-[calc(100%-2rem)] flex items-center gap-2 px-3 py-2 bg-stale-bg border border-stale/20 rounded-xl text-stale text-[12px] font-medium hover:bg-stale/10 transition-colors"
    >
      <span>💤</span>
      <span>{count}件のタスクが放置されています</span>
      <span className="ml-auto text-stale/60">→</span>
    </button>
  );
}
