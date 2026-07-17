import { Logo } from '../../components/layout/Logo';

/** Layout cho Login/Register/Forgot-password — không Sidebar, căn giữa màn hình */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="w-full max-w-md animate-fade-in">{children}</div>
    </div>
  );
}
