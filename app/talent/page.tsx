'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import TalentTable from '@/components/talent/TalentTable';

export default function TalentListPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">全体管理</h2>
                <p className="text-xs text-gray-500 mt-0.5">登録人材の一覧と管理</p>
              </div>
              <a
                href="/session/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                新規セッション
              </a>
            </div>
            <TalentTable />
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
