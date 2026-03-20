'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('確認メールを送信しました。メールを確認してください。');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0A1628, #1565C0)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-10">
        <div className="text-center mb-8">
          <h1 className="font-brand text-5xl font-normal tracking-wider text-midnight">
            BLUE<span className="text-sky">VOX</span>
          </h1>
          <p className="font-serif text-xs text-gray-500 tracking-[0.15em] mt-2">
            あなたの声が、あなたを描く。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 tracking-wide">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition"
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 tracking-wide">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className={`text-xs ${error.includes('確認メール') ? 'text-green-600' : 'text-red-600'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-jinden-blue text-white rounded-lg text-sm font-medium hover:bg-vox transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <div className="spinner w-4 h-4 border-2"></div>}
            {isSignUp ? '新規登録' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-xs text-jinden-blue hover:text-vox transition"
          >
            {isSignUp ? 'アカウントをお持ちの方はこちら' : '新規アカウント作成'}
          </button>
        </div>
      </div>
    </div>
  );
}
