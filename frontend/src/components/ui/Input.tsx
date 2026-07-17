import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Input dùng chung — kèm label + error message chuẩn hóa cho form */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'h-11 rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900 placeholder:text-slate-400',
            'focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30',
            error && 'border-red-400 focus:border-red-500 focus:outline-red-200',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
