import { DEMO_QUESTION_1, DEMO_QUESTION_2 } from '../config/demo.config';
import { adminUploadStep } from './admin-upload-step';
import { createAskQuestionStep } from './chat-question-steps';
import type { DemoStep } from './demo-scenario-engine';
import type { DemoStepContext } from './demo-step-context';
import { dashboardStep, splashStep } from './intro-steps';

/** Danh sách bước kịch bản thật theo đúng thứ tự 16 bước đã chốt trong plan. */
export const demoSteps: DemoStep<DemoStepContext>[] = [
  splashStep,
  dashboardStep,
  createAskQuestionStep('ask-question-1', DEMO_QUESTION_1),
  adminUploadStep,
  createAskQuestionStep('ask-question-2', DEMO_QUESTION_2),
];
