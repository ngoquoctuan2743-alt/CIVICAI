import type { DemoAction } from '../state/demo-state-manager';

/**
 * DemoScenarioEngine — chạy tuần tự danh sách DemoStep thật (gọi API thật
 * qua ctx), không phụ thuộc React nên test được độc lập bằng step/ctx giả.
 * Dừng ngay khi 1 step lỗi hoặc bị huỷ (thoát demo giữa chừng).
 */
export interface DemoStep<TContext> {
  id: string;
  run: (ctx: TContext) => Promise<void>;
}

export async function runScenario<TContext>(
  steps: DemoStep<TContext>[],
  ctx: TContext,
  dispatch: (action: DemoAction) => void,
  isCancelled: () => boolean,
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    if (isCancelled()) return;
    dispatch({ type: 'ADVANCE', stepIndex: i, stepId: steps[i].id });
    try {
      await steps[i].run(ctx);
    } catch (error) {
      if (isCancelled()) return;
      dispatch({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }
  if (!isCancelled()) dispatch({ type: 'COMPLETE' });
}
