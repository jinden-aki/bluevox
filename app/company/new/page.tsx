'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import CompanyForm from '@/components/company/CompanyForm';

export default function CompanyNewPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7">
            <CompanyForm />
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
