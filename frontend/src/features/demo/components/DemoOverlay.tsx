'use client';

import { useDemoMode } from '../hooks/use-demo-mode';

/**
 * Khung Demo Mode — mounted 1 lần ở root layout. Các màn hình thật theo
 * từng bước (splash, chat, upload, analytics...) sẽ thay dần vào nhánh
 * `state.status === 'running'` ở các bước tiếp theo, không đổi cơ chế
 * bật/tắt (F9/F10/F11 vào, ESC thoát) đã hoàn thiện ở đây.
 */
export function DemoOverlay() {
  const { state } = useDemoMode();

  if (state.status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center px-6">
        <p className="text-sm uppercase tracking-widest text-slate-400">VAIC Demo Mode</p>
        {state.status === 'entering' && <p className="mt-2 text-2xl font-semibold">Đang đăng nhập admin_demo…</p>}
        {state.status === 'running' && (
          <p className="mt-2 text-2xl font-semibold">
            Đang chạy demo — bước {state.stepIndex + 1} ({state.stepId ?? '…'})
          </p>
        )}
        {state.status === 'completed' && <p className="mt-2 text-2xl font-semibold">Demo hoàn tất</p>}
        {state.status === 'error' && (
          <p className="mt-2 text-2xl font-semibold text-red-400">Lỗi: {state.error}</p>
        )}
        <p className="mt-6 text-sm text-slate-500">Nhấn ESC để thoát</p>
      </div>
    </div>
  );
}
