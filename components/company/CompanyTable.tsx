'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Company } from '@/lib/types';

type FilterKey = 'all' | 'review' | 'complete';

const filterConfig: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全て' },
  { key: 'review', label: 'レビュー待ち' },
  { key: 'complete', label: '完了' },
];

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  new: { label: '新規', className: 'bg-gray-100 text-gray-600' },
  analyzing: { label: '分析中', className: 'bg-blue-50 text-jinden-blue' },
  review: { label: 'レビュー待ち', className: 'bg-yellow-50 text-yellow-700' },
  complete: { label: '完了', className: 'bg-green-50 text-green-700' },
};

const PHASE_LABEL: Record<string, string> = {
  seed: 'Seed',
  early: 'Early',
  growth: 'Growth',
  later: 'Later',
};

export default function CompanyTable() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setCompanies(data as Company[]);
    }
    setLoading(false);
  };

  const filtered = companies.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.company_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] rounded-full" style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', animation: 'spin .6s linear infinite' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1.5 overflow-x-auto">
          {filterConfig.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap min-h-[36px] ${
                filter === f.key ? 'bg-midnight text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  {companies.filter(c => c.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="企業名で検索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/10 w-full sm:w-52 transition min-h-[40px]"
            />
          </div>
          <button
            onClick={() => router.push('/company/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-midnight text-white rounded-lg text-[13px] font-medium hover:bg-midnight/80 transition min-h-[44px] whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新規企業診断
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-gray-300 rounded-[10px] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70">
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">企業名</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">業界</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">フェーズ</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">ポジション数</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">ステータス</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">作成日</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-gray-500">
                  {search ? '検索結果が見つかりません' : '企業データがありません'}
                </td>
              </tr>
            ) : (
              filtered.map(c => {
                const st = STATUS_LABEL[c.status] || STATUS_LABEL.new;
                const phase = c.analysis?.org_phase?.phase;
                const industry = c.web_research?.industry || c.analysis?.org_phase?.phase_detail || '-';
                const posCount = c.analysis?.positions?.length ?? 0;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition cursor-pointer"
                    onClick={() => router.push(`/company/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-gray-900">{c.company_name}</span>
                      {c.website_url && (
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{c.website_url}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{industry}</span>
                    </td>
                    <td className="px-4 py-3">
                      {phase ? (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-midnight/10 text-midnight">
                          {PHASE_LABEL[phase] || phase}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[13px] font-medium text-gray-700">{posCount > 0 ? posCount : '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{formatDate(c.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/company/${c.id}`); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium hover:bg-gray-200 transition"
                      >
                        詳細を見る
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-300 rounded-[10px]">
            {search ? '検索結果が見つかりません' : '企業データがありません'}
          </div>
        ) : (
          filtered.map(c => {
            const st = STATUS_LABEL[c.status] || STATUS_LABEL.new;
            const phase = c.analysis?.org_phase?.phase;
            const posCount = c.analysis?.positions?.length ?? 0;
            return (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer active:bg-gray-50"
                onClick={() => router.push(`/company/${c.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[14px] font-semibold text-gray-900">{c.company_name}</span>
                  <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${st.className}`}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  {phase && <span className="bg-midnight/10 text-midnight px-1.5 py-0.5 rounded font-semibold">{PHASE_LABEL[phase]}</span>}
                  {posCount > 0 && <span>{posCount}ポジション</span>}
                  <span>{formatDate(c.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {filtered.length} 件表示 / 全 {companies.length} 件
      </div>
    </div>
  );
}
