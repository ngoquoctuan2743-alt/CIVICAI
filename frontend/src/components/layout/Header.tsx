'use client';

import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../stores/auth-context';
import { Logo } from './Logo';
import { NAV_ITEMS } from './nav-items';

/** Header mobile — hiện logo + tiêu đề trang hiện tại (Sidebar ẩn trên mobile) */
export function Header() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const current = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
      <Logo href="/chat" size="sm" />
      <span className="text-sm font-medium text-slate-600">{current?.label}</span>
      <button
        onClick={() => void logout()}
        aria-label="Đăng xuất"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}
