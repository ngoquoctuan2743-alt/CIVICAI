import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

/** Textarea dùng chung — style khớp Input */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
        'focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30',
        'resize-none',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
