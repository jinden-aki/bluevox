'use client';

import { useState, useRef, useEffect } from 'react';
import FeedbackForm from './FeedbackForm';

interface InlineFeedbackProps {
  label: string;
  shareLinkId: string;
  talentId: string;
  talentName: string;
  onSuccess: () => void;
}

export default function InlineFeedback({
  label,
  shareLinkId,
  talentId,
  talentName,
  onSuccess,
}: InlineFeedbackProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [open]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
          open
            ? 'bg-[#1565C0] text-white shadow-sm'
            : 'bg-white text-gray-400 border border-gray-200 hover:text-[#1565C0] hover:border-[#1565C0]/30'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {open ? '閉じる' : 'このセクションにフィードバック'}
      </button>

      {/* Slide-down panel */}
      <div
        ref={panelRef}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: open ? '800px' : '0',
          opacity: open ? 1 : 0,
          marginTop: open ? '12px' : '0',
        }}
      >
        <div
          className="p-5 rounded-2xl"
          style={{
            background: '#F0F4FF',
            border: '1px solid #CBD5E1',
          }}
        >
          <div className="text-[13px] font-semibold text-gray-700 mb-3" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
            「{label}」についてのフィードバック
          </div>
          <FeedbackForm
            shareLinkId={shareLinkId}
            talentId={talentId}
            talentName={talentName}
            sectionKey={label}
            onSuccess={() => {
              onSuccess();
              setTimeout(() => setOpen(false), 3500);
            }}
            compact
          />
        </div>
      </div>
    </div>
  );
}
