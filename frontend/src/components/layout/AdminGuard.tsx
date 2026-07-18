'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../stores/auth-context';
import { Spinner } from '../ui/Spinner';

/** Bọc route Admin — redirect /chat nếu đã đăng nhập nhưng không có role ADMIN */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitializing } = useAuth();
  const router = useRouter();
  const isAdmin = user?.roles.includes('ADMIN') ?? false;

  useEffect(() => {
    if (!isInitializing && !isAdmin) {
      router.replace('/chat');
    }
  }, [isInitializing, isAdmin, router]);

  if (isInitializing || !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return <>{children}</>;
}
