import { adminService } from '../../../services/admin.service';
import { embeddingAdminService } from '../../../services/embedding-admin.service';
import { systemService } from '../../../services/system.service';
import { DEMO_STEP_TRANSITION_MS } from '../config/demo.config';
import type { DashboardStepData } from '../types';
import type { DemoStep } from './demo-scenario-engine';
import type { DemoStepContext } from './demo-step-context';
import { sleep } from './sleep';

/** Step 1 — Splash, thuần trình bày, không gọi API */
export const splashStep: DemoStep<DemoStepContext> = {
  id: 'splash',
  async run(ctx) {
    ctx.setStepData(null);
    await sleep(DEMO_STEP_TRANSITION_MS * 2);
  },
};

/**
 * Step 4 (data cũng được lưu lại để tái dùng ở step 15 Analytics) — health +
 * dashboard + embedding provider health đều là API thật. provider-health có
 * thể lỗi (vd. thiếu key) — bắt lỗi riêng, hiển thị OFFLINE thay vì làm sập
 * cả bước, đúng tinh thần "hiển thị đúng thực trạng" của đề bài.
 */
export const dashboardStep: DemoStep<DemoStepContext> = {
  id: 'dashboard',
  async run(ctx) {
    const [health, dashboard, embeddingHealth] = await Promise.all([
      systemService.getHealth(),
      adminService.getDashboard(),
      embeddingAdminService.getProviderHealth().catch(() => null),
    ]);
    const data: DashboardStepData = { health, dashboard, embeddingHealth };
    ctx.vars.dashboardData = data;
    ctx.setStepData(data);
    await sleep(DEMO_STEP_TRANSITION_MS * 3);
  },
};
