'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  supported: boolean;
  isIOS: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getSR(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ios = detectIOS();
    setIsIOS(ios);
    // On iOS, Web Speech API doesn't work — mark as unsupported
    if (ios) {
      setSupported(false);
      return;
    }
    const SR = getSR();
    setSupported(!!SR);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SR = getSR();
    if (!SR) {
      setError('お使いのブラウザは音声入力に対応していません。');
      return;
    }

    setError(null);

    const recognition = new SR();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      setTranscript(finalText + interimText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      const code = event.error || 'unknown';
      if (code === 'not-allowed') {
        setError(`[${code}] マイクの使用を許可してください。`);
      } else if (code === 'no-speech') {
        setError(`[${code}] 音声が検出されませんでした。もう一度お試しください。`);
      } else if (code !== 'aborted') {
        setError(`[${code}] 音声認識エラーが発生しました。`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setTranscript('');

    try {
      recognition.start();
      setIsListening(true);
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error('recognition.start() threw:', msg);
      setError(`[start-error] ${msg}`);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    supported,
    isIOS,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
