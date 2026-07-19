import type { DemoAction } from '../state/demo-state-manager';
import type { DemoStepContext } from './demo-step-context';

/**
 * DemoScenarioEngine — chạy tuần tự danh sách DemoStep thật (gọi API thật
 * qua ctx), không phụ thuộc React nên test được độc lập bằng step/ctx giả.
 * Dừng ngay khi 1 step lỗi hoặc bị huỷ (thoát demo giữa chừng).
 *
 * QUAN TRỌNG: xoá stepData (setStepData(null)) TRƯỚC khi chạy step tiếp
 * theo, ngay sau khi dispatch ADVANCE — nếu không, có khoảng khắc stepId đã
 * đổi sang bước mới nhưng stepData vẫn còn dữ liệu KIỂU KHÁC của bước cũ
 * (dispatch reducer và setStepData là 2 state riêng, không cập nhật đồng
 * thời), khiến component màn hình mới đọc nhầm field không tồn tại và crash.
 */
export interface DemoStep<TContext extends DemoStepContext = DemoStepContext> {
  id: string;
  run: (ctx: TContext) => Promise<void>;
}

export async function runScenario<TContext extends DemoStepContext>(
  steps: DemoStep<TContext>[],
  ctx: TContext,
  dispatch: (action: DemoAction) => void,
  isCancelled: () => boolean,
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    if (isCancelled()) return;
    dispatch({ type: 'ADVANCE', stepIndex: i, stepId: steps[i].id });
    ctx.setStepData(null);
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
