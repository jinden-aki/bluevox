'use client';

import { useEffect, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  if (addToastFn) addToastFn(message, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const bgColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-[#2E7D32]';
      case 'error': return 'bg-[#C62828]';
      case 'info': return 'bg-jinden-blue';
    }
  };

  return (
    <div className="fixed top-[72px] right-6 z-[300] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${bgColor(t.type)} text-white px-5 py-3 rounded-lg text-sm font-medium shadow-md flex items-center gap-2`}
          style={{ animation: 'toastIn .3s ease, toastOut .3s ease 2.7s forwards' }}
        >
          {t.type === 'success' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          {t.type === 'error' && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
          {t.message}
        </div>
      ))}
    </div>
  );
}
