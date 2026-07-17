import { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'blue' | 'green' | 'gray' | 'red' | 'amber';

const TONE_CLASS: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

/** Badge nhỏ — dùng cho loại văn bản, trạng thái, cấp cơ quan... */
export function Badge({ className, tone = 'gray', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    />
  );
}
