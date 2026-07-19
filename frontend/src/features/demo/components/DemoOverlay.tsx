'use client';

import { useDemoMode } from '../hooks/use-demo-mode';
import type { ChatSimStepData, DashboardStepData } from '../types';
import { ChatSimScreen } from './screens/ChatSimScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SplashScreen } from './screens/SplashScreen';

/**
 * Khung Demo Mode — mounted 1 lần ở root layout. Chọn màn hình theo
 * `state.stepId` (do demoSteps quy định) + `stepData` (do chính step đó đẩy
 * ra qua ctx.setStepData). Bước nào chưa có UI riêng thì rơi vào fallback
 * text — không chặn tiến trình chạy thật của scenario engine.
 */
export function DemoOverlay() {
  const { state, stepData } = useDemoMode();

  if (state.status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950 py-10 text-white">
      {state.status === 'entering' && (
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-slate-400">VAIC Demo Mode</p>
          <p className="mt-2 text-2xl font-semibold">Đang đăng nhập admin_demo…</p>
        </div>
      )}

      {state.status === 'running' && renderStep(state.stepId, stepData)}

      {state.status === 'completed' && (
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-slate-400">VAIC Demo Mode</p>
          <p className="mt-2 text-2xl font-semibold">Demo hoàn tất</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-slate-400">VAIC Demo Mode</p>
          <p className="mt-2 text-2xl font-semibold text-red-400">Lỗi: {state.error}</p>
        </div>
      )}

      <p className="fixed bottom-6 left-1/2 -translate-x-1/2 text-sm text-slate-500">Nhấn ESC để thoát</p>
    </div>
  );
}

function renderStep(stepId: string | null, stepData: unknown) {
  switch (stepId) {
    case 'splash':
      return <SplashScreen />;
    case 'dashboard':
      return stepData ? <DashboardScreen data={stepData as DashboardStepData} /> : null;
    case 'ask-question-1':
    case 'ask-question-2':
      return stepData ? <ChatSimScreen data={stepData as ChatSimStepData} /> : null;
    default:
      return (
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-slate-400">VAIC Demo Mode</p>
          <p className="mt-2 text-2xl font-semibold">Bước: {stepId ?? '…'}</p>
        </div>
      );
  }
}
