import { DEMO_QUESTION_1 } from '../config/demo.config';
import { createAskQuestionStep } from './chat-question-steps';
import type { DemoStep } from './demo-scenario-engine';
import type { DemoStepContext } from './demo-step-context';
import { dashboardStep, splashStep } from './intro-steps';

/**
 * Danh sách bước kịch bản thật theo đúng thứ tự 16 bước đã chốt trong plan.
 * Câu hỏi 2 (sau khi upload tài liệu — Vector Search) được nối thêm ở phần
 * Admin Upload, không khai ở đây để tránh phụ thuộc ngược.
 */
export const demoSteps: DemoStep<DemoStepContext>[] = [
  splashStep,
  dashboardStep,
  createAskQuestionStep('ask-question-1', DEMO_QUESTION_1),
];
