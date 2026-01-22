'use client';

import { useEffect, useState } from 'react';
import { AdUnit } from './AdUnit';

export interface ExportAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const COUNTDOWN_SECONDS = 5;

export function ExportAdModal({ isOpen, onClose, onComplete }: ExportAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(COUNTDOWN_SECONDS);
      return;
    }

    setSecondsLeft(COUNTDOWN_SECONDS);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Watch ad to export</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your download will start after a brief sponsored message.
          </p>
        </div>

        <div className="flex items-center justify-center">
          <div className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
            {secondsLeft > 0 ? `Export starts in ${secondsLeft}s` : 'Starting export...'}
          </div>
        </div>

        <AdUnit slot="1571327187" format="rectangle" className="w-full" maxHeight={200} />

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Thanks for waiting. We will begin your export automatically when the countdown finishes.
        </p>
      </div>
    </div>
  );
}
