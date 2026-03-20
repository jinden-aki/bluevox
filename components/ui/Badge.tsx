'use client';

const statusStyles: Record<string, string> = {
  'new': 'bg-mist text-jinden-blue',
  'analyzing': 'bg-[#FFF8E1] text-[#F57F17]',
  'review': 'bg-[#FFF3E0] text-torch',
  'ready': 'bg-[#E8F5E9] text-[#2E7D32]',
  'matched': 'bg-[#F3E5F5] text-[#7B1FA2]',
  'd-ng': 'bg-[#FFEBEE] text-[#C62828]',
  'd-gem': 'bg-[#FFF8E1] text-[#F57F17]',
  'deleted': 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  'new': '新規',
  'analyzing': '分析中',
  'review': 'レビュー待ち',
  'ready': '推薦可能',
  'matched': 'マッチ済',
  'd-ng': 'D-即NG',
  'd-gem': 'D-原石',
  'deleted': '削除済み',
};

interface BadgeProps {
  status: string;
  className?: string;
}

export default function Badge({ status, className = '' }: BadgeProps) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-500';
  const label = statusLabels[status] || status;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}>
      {label}
    </span>
  );
}

export function LevelBadge({ level }: { level: number | string }) {
  const lv = typeof level === 'string' ? parseFloat(level) : level;
  const lvInt = Math.floor(lv);
  const bgColors: Record<number, string> = {
    1: 'bg-[#9E9E9E]',
    2: 'bg-jinden-blue',
    3: 'bg-vox',
    4: 'bg-[#2E7D32]',
    5: 'bg-torch',
  };
  const bg = bgColors[lvInt] || 'bg-gray-400';

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-brand text-base font-semibold text-white ${bg}`}>
      {lv || '-'}
    </span>
  );
}
