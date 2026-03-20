'use client';

import { useEffect, useRef } from 'react';
import { useVoiceInput } from '@/lib/hooks/useVoiceInput';

interface VoiceInputProps {
  onTranscriptChange: (text: string) => void;
  onStop: (finalText: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

/** Mic icon SVG */
const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className || 'w-4 h-4'} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

/** iOS guide: tell user to use keyboard dictation instead */
function IOSGuide({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
        <MicIcon className="w-4 h-4 text-[#1565C0] flex-shrink-0 mt-0.5" />
        <span className="text-[12px] text-gray-600 leading-relaxed">
          キーボードの <span className="font-semibold">🎤ボタン</span> で音声入力できます
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 max-w-[320px]">
      <div className="w-10 h-10 rounded-full bg-white border border-blue-200 flex items-center justify-center flex-shrink-0">
        <MicIcon className="w-5 h-5 text-[#1565C0]" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-gray-700 leading-relaxed">
          iPhoneの場合
        </p>
        <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">
          テキスト入力欄をタップ → キーボードの <span className="font-semibold">🎤ボタン</span> で音声入力できます
        </p>
      </div>
    </div>
  );
}

export default function VoiceInput({ onTranscriptChange, onStop, disabled, compact }: VoiceInputProps) {
  const { isListening, transcript, supported, isIOS, error, startListening, stopListening } = useVoiceInput();
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    if (isListening && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      onTranscriptChange(transcript);
    }
  }, [isListening, transcript, onTranscriptChange]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript) onStop(transcript);
      lastTranscriptRef.current = '';
    } else {
      lastTranscriptRef.current = '';
      startListening();
    }
  };

  /* ---- iOS: show keyboard dictation guide, hide voice button ---- */
  if (isIOS) {
    return <IOSGuide compact={compact} />;
  }

  /* ---- Browser doesn't support SpeechRecognition ---- */
  if (!supported) {
    return null;
  }

  /* ---- Compact mode (PC Chrome/Edge) ---- */
  if (compact) {
    return (
      <div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
            isListening
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isListening ? (
            <>
              <span className="voice-recording relative flex h-4 w-4">
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
              </span>
              話しています...
            </>
          ) : (
            <>
              <MicIcon />
              音声で入力
            </>
          )}
        </button>
        {error && <p className="text-[10px] text-red-400 mt-1.5 max-w-[280px]">{error}</p>}
      </div>
    );
  }

  /* ---- Full mode (PC Chrome/Edge) ---- */
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all ${
          isListening
            ? 'bg-red-600 voice-recording shadow-lg'
            : 'bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isListening ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      <span className={`text-[12px] font-medium ${isListening ? 'text-red-600' : 'text-gray-400'}`}>
        {isListening ? '話しています...タップで停止' : '話しかけるだけでOK'}
      </span>
      {error && <p className="text-[10px] text-red-400 text-center max-w-[240px]">{error}</p>}
    </div>
  );
}
