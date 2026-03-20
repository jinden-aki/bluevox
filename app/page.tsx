'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';

interface KPIData {
  total: number;
  ready: number;
  review: number;
  dGem: number;
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPIData>({ total: 0, ready: 0, review: 0, dGem: 0 });

  useEffect(() => {
    loadKPI();
  }, []);

  const loadKPI = async () => {
    const { data: talents } = await supabase
      .from('talents')
      .select('status')
      .is('deleted_at', null);

    if (talents) {
      setKpi({
        total: talents.length,
        ready: talents.filter(t => t.status === 'ready').length,
        review: talents.filter(t => t.status === 'review').length,
        dGem: talents.filter(t => t.status === 'd-gem').length,
      });
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              <KPICard label="TOTAL TALENTS" value={kpi.total} color="blue" sub="登録人材数" />
              <KPICard label="READY" value={kpi.ready} color="sky" sub="推薦可能" />
              <KPICard label="REVIEW" value={kpi.review} color="green" sub="レビュー待ち" />
              <KPICard label="D-GEMS" value={kpi.dGem} color="torch" sub="D-原石" />
            </div>

            <div className="bg-white border border-gray-300 rounded-[10px] shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">クイックアクション</h3>
              <div className="flex flex-wrap gap-3">
                <a href="/session/new" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition min-h-[44px]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  新規セッション
                </a>
                <a href="/talent" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-mist text-jinden-blue rounded-lg text-[13px] font-medium hover:bg-wash transition min-h-[44px]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  全体管理を開く
                </a>
                <a href="/matching" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-mist text-jinden-blue rounded-lg text-[13px] font-medium hover:bg-wash transition min-h-[44px]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  案件マッチング
                </a>
              </div>
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}

function KPICard({ label, value, color, sub }: { label: string; value: number; color: string; sub: string }) {
  const borderColors: Record<string, string> = {
    blue: 'before:bg-jinden-blue',
    sky: 'before:bg-sky',
    green: 'before:bg-[#2E7D32]',
    torch: 'before:bg-torch',
  };

  return (
    <div className={`bg-white border border-gray-300 rounded-[10px] p-5 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full ${borderColors[color]}`}>
      <div className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase mb-2">{label}</div>
      <div className="font-brand text-4xl font-normal text-midnight leading-none">{value}</div>
      <div className="text-[11px] text-gray-500 mt-1.5">{sub}</div>
    </div>
  );
}
