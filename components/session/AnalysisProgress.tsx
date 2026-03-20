'use client';

import { useEffect, useState, useRef } from 'react';

const STEPS = [
  'D判定チェック',
  'PCMタイプ判定',
  '5軸採点',
  'Lv確定・推薦文生成',
] as const;

interface AnalysisProgressProps {
  onRetry?: () => void;
  error?: string | null;
}

export default function AnalysisProgress({ onRetry, error }: AnalysisProgressProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (error) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [error]);

  useEffect(() => {
    if (error) return;
    // Advance steps every 2 seconds
    if (elapsed > 0 && elapsed % 2 === 0) {
      setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  }, [elapsed, error]);

  if (error) {
    return (
      <div className="bg-white border border-gray-300 rounded-[10px] p-10 text-center">
        <p className="text-[#C62828] font-medium mb-3">分析エラーが発生しました</p>
        <p className="text-[13px] text-gray-700 mb-6">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 bg-jinden-blue text-white rounded-lg text-[13px] font-medium hover:bg-vox transition"
          >
            再試行
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-[10px] p-10 text-center">
      {/* Spinner */}
      <div
        className="w-12 h-12 mx-auto mb-6 rounded-full border-[3px]"
        style={{
          borderColor: '#E0E0E0',
          borderTopColor: '#1565C0',
          animation: 'spin .6s linear infinite',
        }}
      />

      <p className="text-[15px] font-medium text-jinden-blue mb-1">AI分析を実行中...</p>
      <p className="text-xs text-gray-500 mb-5">
        生成中... ({elapsed}秒経過)
      </p>

      {/* Steps */}
      <div className="max-w-[400px] mx-auto text-left space-y-2">
        {STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] transition-all ${
                isDone
                  ? 'bg-green-50 text-green-700'
                  : isActive
                    ? 'bg-blue-50 text-jinden-blue font-medium'
                    : 'text-gray-400'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-jinden-blue text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              {step}
              {isActive && (
                <div
                  className="w-4 h-4 ml-auto rounded-full border-2"
                  style={{
                    borderColor: '#93C5FD',
                    borderTopColor: '#1565C0',
                    animation: 'spin .6s linear infinite',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
