'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import CompanyTable from '@/components/company/CompanyTable';

export default function CompanyListPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">
            <div className="mb-5">
              <h2 className="font-brand text-[24px] font-normal text-midnight">企業診断</h2>
              <p className="text-[13px] text-gray-500 mt-1">企業ヒアリング → AI分析 → カンパニーシート自動生成</p>
            </div>
            <CompanyTable />
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
