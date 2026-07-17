import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Spinner đơn giản — dùng khi loading toàn trang/khối lớn */
export function Spinner({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin text-primary', className)}
      role="status"
      aria-label="Đang tải"
    />
  );
}
