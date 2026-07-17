'use client';

import { Mic, Square } from 'lucide-react';
import { cn } from '../../lib/cn';
import { WaveAnimation } from './WaveAnimation';

interface MicButtonProps {
  isSupported: boolean;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Button Microphone — Recording/Stop states (NHIỆM VỤ 4) */
export function MicButton({ isSupported, isRecording, onStart, onStop }: MicButtonProps) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={isRecording ? onStop : onStart}
      aria-label={isRecording ? 'Dừng ghi âm' : 'Bắt đầu nói với trợ lý'}
      aria-pressed={isRecording}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        isRecording ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
      )}
    >
      {isRecording ? <WaveAnimation /> : <Mic size={18} />}
      {isRecording && <span className="sr-only">Đang ghi âm, bấm để dừng</span>}
    </button>
  );
}
