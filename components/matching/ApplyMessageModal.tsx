'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { callClaude, parseJSON } from '@/lib/claude';
import { buildApplyMessagePrompt, type ApplyMessages } from '@/lib/prompts/apply-message';
import { showToast } from '@/components/ui/Toast';
import type { JobMatch, Talent } from '@/lib/types';

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const tabs = [
  { key: 'formal' as const, label: '丁寧版（メール向け）' },
  { key: 'casual' as const, label: 'カジュアル版（Wantedly向け）' },
  { key: 'short'  as const, label: '簡潔版（DM向け）' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApplyMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent;
  job: JobMatch;
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApplyMessageModal({ isOpen, onClose, talent, job, apiKey }: ApplyMessageModalProps) {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ApplyMessages | null>(null);
  const [activeTab, setActiveTab] = useState<'formal' | 'casual' | 'short'>('formal');
  const [editedMessages, setEditedMessages] = useState<ApplyMessages>({ formal: '', casual: '', short: '' });
  const [error, setError] = useState<string | null>(null);

  // Generate messages when modal opens
  useEffect(() => {
    if (isOpen && !messages && !loading) {
      generateMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages(null);
      setEditedMessages({ formal: '', casual: '', short: '' });
      setError(null);
      setActiveTab('formal');
    }
  }, [isOpen]);

  const generateMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!apiKey) {
        throw new Error('API Keyが未設定です');
      }

      // Build the prompt using the shared utility
      const prompt = buildApplyMessagePrompt({
        talent: {
          id: talent.id,
          name: talent.name,
          analysis: talent.analysis as Parameters<typeof buildApplyMessagePrompt>[0]['talent']['analysis'],
        },
        job: {
          company: job.company,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          phase: job.phase,
          industry: job.industry,
          fit_reasons: job.fit_reasons,
          verb_match: job.verb_match,
        },
      });

      const result = await callClaude({
        task: 'applyMessage',
        systemPrompt: prompt,
        userContent: 'この人材と案件の組み合わせで、応募メッセージを3パターン生成してください。JSONのみ出力。',
        apiKey,
        maxTokens: 4000,
      });

      // Parse the JSON response
      const parsed = parseJSON(result.text);

      if (!parsed || (!parsed.formal && !parsed.casual && !parsed.short)) {
        throw new Error('メッセージの生成に失敗しました。レスポンスの形式が不正です。');
      }

      const msgs: ApplyMessages = {
        formal: parsed.formal || '',
        casual: parsed.casual || '',
        short: parsed.short || '',
      };

      setMessages(msgs);
      setEditedMessages(msgs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      console.error('[BLUEVOX] Apply message generation error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = editedMessages[activeTab];
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      showToast('メッセージをコピーしました', 'success');
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('コピーしました', 'success');
    }
  };

  const handleTextChange = (key: 'formal' | 'casual' | 'short', value: string) => {
    setEditedMessages(prev => ({ ...prev, [key]: value }));
  };

  // Footer buttons
  const footer = messages ? (
    <>
      <span className="text-[12px] text-gray-400 mr-auto">内容を編集してからコピーできます</span>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
      >
        閉じる
      </button>
      <button
        onClick={handleCopy}
        className="px-6 py-2 text-sm font-medium text-white bg-jinden-blue rounded-lg hover:bg-vox transition"
      >
        コピーする
      </button>
    </>
  ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="720px"
      footer={footer}
    >
      {/* Custom header */}
      <div className="flex items-center gap-3 -mt-2 mb-5">
        <h3 className="text-base font-semibold text-gray-900">応募メッセージ生成</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-mist text-jinden-blue">
          {job.company}
        </span>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div
            className="w-10 h-10 border-[3px] rounded-full mb-4"
            style={{
              borderColor: '#E0E0E0',
              borderTopColor: '#1565C0',
              animation: 'spin .6s linear infinite',
            }}
          />
          <p className="text-sm text-gray-700 font-medium">
            {talent.name} さんの強み動詞と {job.company} の業務内容から
          </p>
          <p className="text-sm text-gray-700 font-medium">
            最適な応募メッセージを生成中...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[#C62828] text-sm">{error}</p>
          <button
            onClick={generateMessages}
            className="mt-4 px-4 py-2 text-sm bg-jinden-blue text-white rounded-lg hover:bg-vox transition"
          >
            再試行
          </button>
        </div>
      )}

      {/* Content: tabs + textareas */}
      {messages && (
        <div>
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 mb-4">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-jinden-blue'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-jinden-blue rounded-t" />
                )}
              </button>
            ))}
          </div>

          {/* Textareas (all rendered, toggle display) */}
          {tabs.map(tab => (
            <div key={tab.key} className={activeTab === tab.key ? '' : 'hidden'}>
              <textarea
                value={editedMessages[tab.key]}
                onChange={(e) => handleTextChange(tab.key, e.target.value)}
                className="w-full h-60 px-4 py-3 text-[13px] leading-relaxed text-gray-800 bg-gray-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-jinden-blue/30 focus:border-jinden-blue transition"
                placeholder="メッセージがここに表示されます..."
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-gray-400">
                  {editedMessages[tab.key].length} 文字
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-jinden-blue bg-mist rounded-md hover:bg-wash transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  コピーする
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
