'use client';

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const titleMap: Record<string, string> = {
  '/': 'ダッシュボード',
  '/session/new': '新規セッション',
  '/talent': '全体管理',
  '/matching': '案件マッチングAI',
  '/writer': 'ライター',
  '/thought': 'デジタルツイン',
  '/history': '削除済み履歴',
  '/settings': '設定',
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const getTitle = () => {
    if (pathname.startsWith('/talent/') && pathname !== '/talent') return '個別管理';
    return titleMap[pathname] || 'BLUEVOX';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-300 flex items-center justify-between pl-14 pr-4 md:px-8 sticky top-0 z-50">
      <h2 className="text-[15px] font-medium text-gray-900">{getTitle()}</h2>
      <div className="flex gap-2">
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span className="hidden sm:inline">ログアウト</span>
        </button>
      </div>
    </header>
  );
}
