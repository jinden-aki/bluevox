'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer from '@/components/ui/Toast';
import SessionForm from '@/components/session/SessionForm';

export default function NewSessionPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[1200px]">
            <SessionForm />
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
