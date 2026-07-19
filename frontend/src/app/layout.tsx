import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DemoOverlay } from '../features/demo/components/DemoOverlay';
import { AuthProvider } from '../stores/auth-context';
import { ToastProvider } from '../stores/toast-context';

export const metadata: Metadata = {
  title: 'VAIC 2026 — Trợ lý AI Công dân',
  description:
    'Virtual AI Citizen Assistant — Trợ lý AI hỗ trợ người dân thực hiện thủ tục dịch vụ công.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1d4ed8',
};

/** Layout gốc — bọc toàn app bởi AuthProvider + ToastProvider */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
            <DemoOverlay />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
