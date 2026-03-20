'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import FileUpload from './FileUpload';
import type { UploadedFile } from './FileUpload';
import { submitFeedback, uploadFeedbackFile } from '@/lib/share';
import { detectIOS } from '@/lib/hooks/useVoiceInput';

interface FeedbackFormProps {
  shareLinkId: string;
  talentId: string;
  talentName: string;
  sectionKey?: string | null;
  onSuccess?: () => void;
  compact?: boolean;
}

export default function FeedbackForm({
  shareLinkId,
  talentId,
  talentName,
  sectionKey,
  onSuccess,
  compact,
}: FeedbackFormProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const preVoiceTextRef = useRef('');
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const maxChars = 2000;

  useEffect(() => {
    setIsIOSDevice(detectIOS());
  }, []);

  const handleVoiceChange = useCallback((transcript: string) => {
    const base = preVoiceTextRef.current;
    setText(base ? base + '\n' + transcript : transcript);
  }, []);

  const handleVoiceStop = useCallback((finalText: string) => {
    const base = preVoiceTextRef.current;
    setText(base ? base + '\n' + finalText : finalText);
    preVoiceTextRef.current = base ? base + '\n' + finalText : finalText;
  }, []);

  const handleVoiceStart = useCallback(() => {
    preVoiceTextRef.current = text;
  }, [text]);

  const handleSubmit = async () => {
    if (!text.trim() && files.length === 0) return;
    setSending(true);

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      // Upload first file (for backward compat with DB schema)
      if (files.length > 0) {
        const uploaded = await uploadFeedbackFile(files[0].file, talentId);
        if (uploaded) {
          fileUrl = uploaded.url;
          fileName = files[0].file.name;
          fileType = files[0].file.type;
        }
      }

      // Upload additional files as separate feedbacks
      const extraFiles = files.slice(1);

      let feedbackType: 'text' | 'voice' | 'file' = 'text';
      if (files.length > 0) feedbackType = 'file';

      const success = await submitFeedback({
        shareLinkId,
        talentId,
        talentName,
        feedbackType,
        sectionKey: sectionKey || null,
        content: text.trim() || null,
        fileUrl,
        fileName,
        fileType,
      });

      // Submit extra files as separate feedbacks
      for (const uf of extraFiles) {
        const uploaded = await uploadFeedbackFile(uf.file, talentId);
        if (uploaded) {
          await submitFeedback({
            shareLinkId,
            talentId,
            talentName,
            feedbackType: 'file',
            sectionKey: sectionKey || null,
            content: null,
            fileUrl: uploaded.url,
            fileName: uf.file.name,
            fileType: uf.file.type,
          });
        }
      }

      if (success) {
        setShowOverlay(true);
        setSent(true);
        setText('');
        // Clean up file previews
        files.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
        setFiles([]);
        preVoiceTextRef.current = '';
        onSuccess?.();
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
    } finally {
      setSending(false);
    }
  };

  // Auto-dismiss overlay
  useEffect(() => {
    if (showOverlay) {
      const timer = setTimeout(() => {
        setShowOverlay(false);
        setSent(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showOverlay]);

  /* ---- Success overlay ---- */
  if (showOverlay) {
    return (
      <div className={`relative ${compact ? '' : 'min-h-[300px]'} flex items-center justify-center`}>
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-500"
          style={{ background: 'rgba(46,125,50,0.06)' }}
        />
        <div className="relative text-center py-8 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: '#E8F5E9' }}>
            <svg className="w-8 h-8 check-anim" style={{ color: '#2E7D32' }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[18px] font-semibold text-gray-800 mb-1" style={{ fontFamily: "'Noto Serif JP', serif" }}>
            ありがとうございます!
          </p>
          <p className="text-[14px] text-gray-500">
            じんでんが確認します
          </p>
        </div>
      </div>
    );
  }

  /* ---- Sent state (after overlay dismissed) ---- */
  if (sent && !showOverlay) {
    setSent(false);
  }

  /* ---- Main form ---- */
  return (
    <div className="space-y-4">
      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= maxChars) setText(e.target.value);
          }}
          onFocus={handleVoiceStart}
          placeholder={
            sectionKey
              ? `「${sectionKey}」について気になったこと、追加で伝えたいことを書いてください${isIOSDevice ? '（キーボードの🎤ボタンで音声入力もできます）' : ''}`
              : isIOSDevice
                ? '気になったこと、伝えたいことを自由に。キーボードの🎤ボタンで音声入力もできます'
                : '例：強みの部分、もう1つ思い出したエピソードがあって...'
          }
          disabled={sending}
          className="w-full p-5 bg-white border border-[#CBD5E1] rounded-xl text-[14px] text-gray-800 leading-[1.9] placeholder:text-gray-300 focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/15 transition resize-none disabled:opacity-50"
          style={{
            minHeight: compact ? '100px' : '160px',
            fontFamily: "'Noto Sans JP', sans-serif",
            borderRadius: '12px',
          }}
        />
        <span className="absolute bottom-3 right-4 text-[11px] text-gray-300">
          {text.length}/{maxChars}
        </span>
      </div>

      {/* Voice + File row */}
      <div className={`flex ${compact ? 'flex-wrap items-center gap-3' : 'flex-col sm:flex-row items-start sm:items-center gap-4'}`}>
        <VoiceInput
          onTranscriptChange={handleVoiceChange}
          onStop={handleVoiceStop}
          disabled={sending}
          compact={compact}
        />
        {!compact && (
          <span className="text-[12px] text-gray-300 hidden sm:block">|</span>
        )}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('file-upload-area');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          ファイル添付
        </button>
      </div>

      {/* File upload area */}
      <div id="file-upload-area">
        <FileUpload
          files={files}
          onFilesChange={setFiles}
          disabled={sending}
          compact={compact}
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={sending || (!text.trim() && files.length === 0)}
        className="w-full py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.99]"
        style={{
          background: sending ? '#9E9E9E' : '#1565C0',
          borderRadius: compact ? '10px' : '12px',
        }}
      >
        {sending ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="w-4 h-4 border-2 rounded-full"
              style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .6s linear infinite' }}
            />
            送信中...
          </span>
        ) : (
          compact ? '送信する' : 'フィードバックを送信する'
        )}
      </button>
    </div>
  );
}
