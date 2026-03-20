'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastContainer, { showToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('app_settings')
      .select('api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (data?.api_key_encrypted) {
      setApiKey(data.api_key_encrypted);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('ログインが必要です', 'error');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { user_id: user.id, api_key_encrypted: apiKey, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      showToast('保存に失敗しました: ' + error.message, 'error');
    } else {
      showToast('API Keyを保存しました', 'success');
    }
    setSaving(false);
  };

  const testApiKey = async () => {
    if (!apiKey) {
      showToast('API Keyを入力してください', 'error');
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (response.ok) {
        showToast('API Key は有効です', 'success');
      } else {
        const err = await response.json().catch(() => ({}));
        showToast('API Key エラー: ' + (err.error?.message || response.status), 'error');
      }
    } catch (err: any) {
      showToast('接続エラー: ' + err.message, 'error');
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 md:ml-60 flex-1 min-h-screen">
          <Topbar />
          <div className="p-4 md:p-7 max-w-[800px]">
            <div className="bg-white border border-gray-300 rounded-[10px] shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">API設定</h3>
              </div>
              <div className="p-6">
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-700 mb-2 tracking-wide">
                    Claude API Key
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-[13px] font-mono focus:outline-none focus:border-jinden-blue focus:ring-2 focus:ring-jinden-blue/10 transition pr-10"
                        placeholder="sk-ant-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      >
                        {showKey ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Anthropic API Keyを入力してください。ブラウザからClaude APIを直接呼び出します。
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition disabled:opacity-40"
                  >
                    {saving && <div className="spinner w-3.5 h-3.5 border-2"></div>}
                    保存
                  </button>
                  <button
                    onClick={testApiKey}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-mist text-jinden-blue rounded-lg text-[13px] font-medium hover:bg-wash transition"
                  >
                    テスト
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">モデル設定</h4>
                  <div className="space-y-2 text-[13px] text-gray-600">
                    <div className="flex justify-between py-1.5 px-3 bg-gray-50 rounded">
                      <span>人材分析</span>
                      <span className="font-mono text-xs text-jinden-blue">claude-sonnet-4-20250514</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 bg-gray-50 rounded">
                      <span>案件マッチング</span>
                      <span className="font-mono text-xs text-jinden-blue">claude-sonnet-4-20250514</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 bg-gray-50 rounded">
                      <span>応募メッセージ生成</span>
                      <span className="font-mono text-xs text-[#2E7D32]">claude-haiku-4-5-20251001</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 bg-gray-50 rounded">
                      <span>思想DB分析</span>
                      <span className="font-mono text-xs text-[#2E7D32]">claude-haiku-4-5-20251001</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-3">
                    応募メッセージと思想DB分析はHaiku 4.5を使用してコストを最適化しています。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
