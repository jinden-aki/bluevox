'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface BulkInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: { title: string; tags: string[] }[]) => void;
}

export default function BulkInput({ isOpen, onClose, onSubmit }: BulkInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const lines = text.split('\n').filter(l => l.trim());
    const items = lines.map(line => {
      const tags: string[] = [];
      const cleaned = line.replace(/#(\S+)/g, (_, tag) => {
        tags.push(tag);
        return '';
      }).trim();
      return { title: cleaned || line.trim(), tags };
    });

    if (items.length > 0) {
      onSubmit(items);
      setText('');
      onClose();
    }
  };

  const lineCount = text.split('\n').filter(l => l.trim()).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="一括入力" maxWidth="600px" footer={
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs text-gray-500 flex-1">
          {lineCount > 0 ? `${lineCount}件のアイテム` : '各行が1つのアイテムになります'}
        </span>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={lineCount === 0}
          className="px-4 py-2 bg-jinden-blue text-white text-sm rounded-lg font-medium disabled:opacity-40 hover:bg-vox transition"
        >
          一括追加 ({lineCount}件)
        </button>
      </div>
    }>
      <p className="text-xs text-gray-500 mb-3">
        1行に1つのタスクを入力してください。行頭に #タグ を付けると自動分類されます。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`#事業 社長Aにメール返信\n#事業 Blueprint修正（小森の経歴部分）\n#SNS 今日のセッションからX投稿ネタ\n#アイデア マンダラート機能の設計\n今日のランチ予約`}
        className="w-full border border-gray-200 rounded-lg p-3 text-sm leading-relaxed outline-none focus:border-jinden-blue focus:ring-1 focus:ring-jinden-blue/30 resize-none"
        style={{ minHeight: '300px' }}
        autoFocus
      />
    </Modal>
  );
}
