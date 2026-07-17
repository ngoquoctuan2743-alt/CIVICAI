import { Landmark } from 'lucide-react';
import Link from 'next/link';

/** Logo VAIC dùng chung — Landing, Header, Sidebar */
export function Logo({ href = '/', size = 'md' }: { href?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: { icon: 16, text: 'text-base' }, md: { icon: 20, text: 'text-lg' }, lg: { icon: 32, text: 'text-3xl' } }[size];
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-bold text-primary-dark">
      <span className="flex items-center justify-center rounded-lg bg-primary p-1.5 text-white">
        <Landmark size={dims.icon} aria-hidden="true" />
      </span>
      <span className={dims.text}>VAIC</span>
    </Link>
  );
}
