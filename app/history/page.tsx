'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer, { showToast } from '@/components/ui/Toast';

interface DeletedTalent {
  id: string;
  name: string;
  company: string;
  deleted_at: string;
  previous_status: string;
}

export default function HistoryPage() {
  const [deleted, setDeleted] = useState<DeletedTalent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeleted();
  }, []);

  const loadDeleted = async () => {
    const { data } = await supabase
      .from('talents')
      .select('id, name, company, deleted_at, previous_status')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (data) setDeleted(data as DeletedTalent[]);
    setLoading(false);
  };

  const handleRestore = async (id: string) => {
    if (!confirm('この人材を復元しますか？')) return;

    const talent = deleted.find(t => t.id === id);
    const restoreStatus = talent?.previous_status || 'review';

    const { error } = await supabase
      .from('talents')
      .update({ deleted_at: null, status: restoreStatus, previous_status: null })
      .eq('id', id);

    if (error) {
      showToast('復元に失敗しました: ' + error.message, 'error');
    } else {
      showToast('復元しました', 'success');
      loadDeleted();
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const talent = deleted.find(t => t.id === id);
    if (!confirm(`「${talent?.name}」を完全に削除しますか？\nこの操作は取り消せません。`)) return;

    const { error } = await supabase.from('talents').delete().eq('id', id);

    if (error) {
      showToast('削除に失敗しました: ' + error.message, 'error');
    } else {
      showToast('完全に削除しました', 'success');
      loadDeleted();
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">
            <div className="bg-white border border-gray-300 rounded-[10px] shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">削除済み履歴 ({deleted.length})</h3>
              </div>

              {loading ? (
                <div className="p-10 text-center">
                  <div className="spinner-dark w-8 h-8 border-2 mx-auto" style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin .6s linear infinite' }}></div>
                </div>
              ) : deleted.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <h3 className="text-base font-medium text-gray-700 mb-2">削除済みの人材はありません</h3>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-px">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr>
                        <th className="text-left px-3.5 py-2.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase border-b-2 border-gray-300 bg-mist">氏名</th>
                        <th className="text-left px-3.5 py-2.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase border-b-2 border-gray-300 bg-mist">社名</th>
                        <th className="text-left px-3.5 py-2.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase border-b-2 border-gray-300 bg-mist">削除日</th>
                        <th className="text-left px-3.5 py-2.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase border-b-2 border-gray-300 bg-mist"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deleted.map(t => (
                        <tr key={t.id} className="hover:bg-mist transition">
                          <td className="px-3.5 py-3 text-[13px] border-b border-gray-100"><strong>{t.name}</strong></td>
                          <td className="px-3.5 py-3 text-[13px] border-b border-gray-100">{t.company || '—'}</td>
                          <td className="px-3.5 py-3 text-[13px] border-b border-gray-100">{formatDate(t.deleted_at)}</td>
                          <td className="px-3.5 py-3 text-[13px] border-b border-gray-100 whitespace-nowrap">
                            <button
                              onClick={() => handleRestore(t.id)}
                              className="text-[11px] px-2 py-0.5 bg-jinden-blue text-white border-none rounded cursor-pointer mr-1.5 hover:bg-vox transition"
                            >
                              復元
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(t.id)}
                              className="text-[11px] px-2 py-0.5 bg-[#C62828] text-white border-none rounded cursor-pointer hover:bg-red-700 transition"
                            >
                              完全削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
