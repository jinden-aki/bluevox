'use client';

import { TaskItem } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';

interface TrashPaneProps {
  tasks: TaskItem[];
  onRestore: (task: TaskItem) => void;
  onHardDelete: (id: string) => void;
}

export default function TrashPane({ tasks, onRestore, onHardDelete }: TrashPaneProps) {
  const deletedTasks = tasks.filter(t => t.status === 'deleted');

  const handleRestore = async (task: TaskItem) => {
    const { data } = await supabase
      .from('items')
      .update({ status: 'inbox', updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .select()
      .single();
    if (data) {
      onRestore(data as TaskItem);
      showToast('復元しました', 'success');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('完全に削除しますか？元に戻せません。')) return;
    await supabase.from('items').delete().eq('id', id);
    onHardDelete(id);
    showToast('削除しました', 'success');
  };

  if (deletedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-3">🗑️</div>
        <p className="text-[14px]">ゴミ箱は空です</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {deletedTasks.map(task => (
        <div key={task.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-gray-500 line-through">{task.title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {new Date(task.updated_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleRestore(task)}
              className="text-[12px] px-2 py-1 rounded-lg border border-jinden-blue/30 text-jinden-blue hover:bg-mist transition-colors"
            >
              復元
            </button>
            <button
              onClick={() => handleDelete(task.id)}
              className="text-[12px] px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            >
              完全削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
