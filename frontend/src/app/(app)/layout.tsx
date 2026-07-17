import { AuthGuard } from '../../components/layout/AuthGuard';
import { Header } from '../../components/layout/Header';
import { MobileNav } from '../../components/layout/MobileNav';
import { Sidebar } from '../../components/layout/Sidebar';

/** AppShell — layout cho mọi trang cần đăng nhập: Sidebar (desktop) + Header/MobileNav (mobile) */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="min-w-0 flex-1 pb-14 md:pb-0">{children}</main>
          <MobileNav />
        </div>
      </div>
    </AuthGuard>
  );
}
