'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUnreadFeedbackCounts } from '@/lib/share';
import type { Talent } from '@/lib/types';
import { SEGMENT_CONFIG, type TalentSegment } from '@/lib/types';
import Badge, { LevelBadge } from '@/components/ui/Badge';

type FilterKey = 'all' | 'ready' | 'review' | 'd-gem';
type SegmentFilterKey = 'all' | TalentSegment;

const segmentFilterConfig: { key: SegmentFilterKey; label: string; icon?: string }[] = [
  { key: 'all', label: '全セグメント' },
  ...Object.entries(SEGMENT_CONFIG).map(([k, v]) => ({
    key: k as SegmentFilterKey,
    label: v.labelShort,
    icon: v.icon,
  })),
];

const filterConfig: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全て' },
  { key: 'ready', label: '推薦可能' },
  { key: 'review', label: 'レビュー待ち' },
  { key: 'd-gem', label: 'D-原石' },
];

export default function TalentTable() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fbCounts, setFbCounts] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    loadTalents();
  }, []);

  const loadTalents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('talents')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (data && !error) {
      const talentList = data as Talent[];
      setTalents(talentList);
      // Load feedback counts
      const ids = talentList.map((t) => t.id);
      if (ids.length > 0) {
        const counts = await getUnreadFeedbackCounts(ids);
        setFbCounts(counts);
      }
    }
    setLoading(false);
  };

  const filtered = talents.filter(t => {
    if (segmentFilter !== 'all') {
      const tSeg = (t.segment || 'ca') as TalentSegment;
      if (tSeg !== segmentFilter) return false;
    }
    if (filter !== 'all' && t.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.name.toLowerCase().includes(q) &&
        !(t.company || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const getType = (t: Talent): string => {
    const a = t.analysis;
    if (!a) return '-';
    return a.five_axes?.talent_type || '-';
  };

  const getLv = (t: Talent): number | string => {
    const a = t.analysis;
    if (!a) return '-';
    return a.five_axes?.total_lv || '-';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner-dark w-8 h-8 border-[3px]" style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Filters and search */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Segment filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-gray-200">
          {segmentFilterConfig.map(sf => {
            const count = sf.key === 'all'
              ? talents.length
              : talents.filter(t => (t.segment || 'ca') === sf.key).length;
            const cfg = sf.key !== 'all' ? SEGMENT_CONFIG[sf.key as TalentSegment] : null;
            return (
              <button
                key={sf.key}
                onClick={() => setSegmentFilter(sf.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap min-h-[36px] ${
                  segmentFilter === sf.key
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={
                  segmentFilter === sf.key && cfg
                    ? { backgroundColor: cfg.color }
                    : segmentFilter === sf.key
                    ? { backgroundColor: '#1565C0' }
                    : undefined
                }
              >
                {sf.icon && <span className="text-sm">{sf.icon}</span>}
                {sf.label}
                <span className={`ml-1 ${segmentFilter === sf.key ? 'opacity-80' : 'opacity-50'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {filterConfig.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap min-h-[36px] ${
                filter === f.key
                  ? 'bg-jinden-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  {talents.filter(t => t.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="名前・企業で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 w-full sm:w-56 transition min-h-[40px]"
          />
        </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-gray-300 rounded-[10px] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70">
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">名前</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">企業</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">セグメント</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">タイプ</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">Lv</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">ステータス</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">FB</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">作成日</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-sm text-gray-500">
                  {search ? '検索結果が見つかりません' : '人材データがありません'}
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr
                  key={t.id}
                  className="border-b border-gray-100 hover:bg-mist/30 transition cursor-pointer"
                  onClick={() => router.push(`/talent/${t.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-medium text-gray-900">{t.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{t.company || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const seg = (t.segment || 'ca') as TalentSegment;
                      const cfg = SEGMENT_CONFIG[seg];
                      return (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
                        >
                          {cfg.icon} {cfg.labelShort}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700">{getType(t)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {typeof getLv(t) === 'number' ? (
                      <LevelBadge level={getLv(t) as number} />
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fbCounts[t.id] > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                        {fbCounts[t.id]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{formatDate(t.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/talent/${t.id}/job-match`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-mist text-jinden-blue rounded-md text-[11px] font-medium hover:bg-wash transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      案件検索
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-300 rounded-[10px]">
            {search ? '検索結果が見つかりません' : '人材データがありません'}
          </div>
        ) : (
          filtered.map(t => (
            <div
              key={t.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:bg-mist/30 transition cursor-pointer"
              onClick={() => router.push(`/talent/${t.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-gray-900 truncate">{t.name}</span>
                    {(() => {
                      const seg = (t.segment || 'ca') as TalentSegment;
                      const cfg = SEGMENT_CONFIG[seg];
                      return (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
                        >
                          {cfg.labelShort}
                        </span>
                      );
                    })()}
                    {typeof getLv(t) === 'number' && <LevelBadge level={getLv(t) as number} />}
                  </div>
                  {t.company && (
                    <p className="text-[12px] text-gray-500 mt-0.5 truncate">{t.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge status={t.status} />
                  {fbCounts[t.id] > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                      {fbCounts[t.id]}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span>{getType(t)}</span>
                  <span>|</span>
                  <span>{formatDate(t.created_at)}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/talent/${t.id}/job-match`);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-mist text-jinden-blue rounded-md text-[11px] font-medium hover:bg-wash transition min-h-[32px]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  案件検索
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-3 text-xs text-gray-500">
        {filtered.length} 件表示 / 全 {talents.length} 件
      </div>
    </div>
  );
}
