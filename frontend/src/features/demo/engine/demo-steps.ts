import type { DemoStep } from './demo-scenario-engine';
import type { DemoStepContext } from './demo-step-context';

/**
 * Danh sách bước kịch bản thật theo đúng thứ tự 16 bước đã chốt trong plan.
 * Rỗng ở giai đoạn này — các bước cụ thể (splash/dashboard/chat/upload/...)
 * được nối dần vào đây ở các task tiếp theo, không đổi cơ chế chạy.
 */
export const demoSteps: DemoStep<DemoStepContext>[] = [];
