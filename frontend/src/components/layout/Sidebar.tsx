'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../stores/auth-context';
import { Logo } from './Logo';
import { NAV_ITEMS } from './nav-items';

/** Sidebar desktop/tablet — ẩn trên mobile (thay bằng MobileNav) */
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Logo href="/chat" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 thin-scrollbar" aria-label="Điều hướng chính">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                active ? 'bg-primary/10 text-primary-dark' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 truncate px-2 text-xs text-slate-500">{user?.email}</div>
        <button
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <LogOut size={18} aria-hidden="true" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
