'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/cn';
import { useAuth } from '../../stores/auth-context';
import { ADMIN_NAV_ITEM, NAV_ITEMS } from './nav-items';

/** Bottom navigation — chỉ hiển thị trên mobile (Responsive — NHIỆM VỤ RESPONSIVE) */
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = user?.roles.includes('ADMIN') ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      aria-label="Điều hướng chính (di động)"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
              active ? 'text-primary' : 'text-slate-500',
            )}
          >
            <Icon size={20} aria-hidden="true" />
            <span className="w-full truncate px-1 text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
