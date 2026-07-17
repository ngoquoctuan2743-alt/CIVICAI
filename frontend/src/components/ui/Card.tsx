import { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** Card container dùng chung — nền trắng, bo góc, viền nhạt (Government Style minimal) */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    />
  );
}
