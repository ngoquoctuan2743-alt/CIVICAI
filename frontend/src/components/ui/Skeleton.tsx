import { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** Loading Skeleton — hiệu ứng nhẹ (pulse), dùng khi chờ dữ liệu danh sách */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} {...props} />;
}

/** Bộ skeleton dựng sẵn cho danh sách card (Procedures/Legal/Agencies) */
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="mb-2 h-5 w-2/3" />
          <Skeleton className="mb-1 h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}
