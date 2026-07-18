'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminGuard } from '../../../components/layout/AdminGuard';
import { cn } from '../../../lib/cn';

const ADMIN_TABS = [
  { href: '/admin', label: 'Tổng quan' },
  { href: '/admin/procedures', label: 'Thủ tục hành chính' },
  { href: '/admin/legal', label: 'Văn bản pháp luật' },
  { href: '/admin/agencies', label: 'Cơ quan nhà nước' },
] as const;

/** Layout Dashboard Admin — chỉ ADMIN truy cập được (AdminGuard) */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Dashboard Admin</h1>
        <p className="mb-5 text-sm text-slate-500">Quản trị nội dung phục vụ tra cứu và trợ lý AI.</p>

        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Điều hướng Admin">
          {ADMIN_TABS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'border-primary text-primary-dark' : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </AdminGuard>
  );
}
