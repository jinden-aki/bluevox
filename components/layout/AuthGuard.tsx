'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Check current session once on mount
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (session) {
          setAuthenticated(true);
        } else {
          router.replace('/login');
        }
      } catch {
        if (mountedRef.current) {
          router.replace('/login');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // 2. Listen for auth state changes (login/logout from other tabs, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      if (session) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        router.replace('/login');
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <div
            className="w-12 h-12 border-[3px] mx-auto mb-4 rounded-full"
            style={{ borderColor: '#E0E0E0', borderTopColor: '#1565C0', animation: 'spin .6s linear infinite' }}
          />
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return <>{children}</>;
}
