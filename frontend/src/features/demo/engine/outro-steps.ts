import { chunkingAdminService } from '../../../services/chunking-admin.service';
import { embeddingAdminService } from '../../../services/embedding-admin.service';
import { knowledgeDocumentsAdminService } from '../../../services/knowledge-documents-admin.service';
import { DEMO_STEP_TRANSITION_MS } from '../config/demo.config';
import type { AnalyticsStepData } from '../types';
import type { DemoStep } from './demo-scenario-engine';
import type { DemoStepContext } from './demo-step-context';
import { sleep } from './sleep';

/** Step 15 — toàn bộ số liệu thật, gọi song song 4 API đã có sẵn */
export const analyticsStep: DemoStep<DemoStepContext> = {
  id: 'analytics',
  async run(ctx) {
    const [documents, chunkMetrics, embeddingMetrics, embeddingHealth] = await Promise.all([
      knowledgeDocumentsAdminService.findAll({ page: 1, limit: 1 }),
      chunkingAdminService.metrics(),
      embeddingAdminService.metrics(),
      embeddingAdminService.getProviderHealth().catch(() => null),
    ]);
    const data: AnalyticsStepData = {
      documentCount: documents.total,
      chunkMetrics,
      embeddingMetrics,
      embeddingHealth,
    };
    ctx.setStepData(data);
    await sleep(DEMO_STEP_TRANSITION_MS * 3);
  },
};

/** Step 16 — kết thúc, thuần trình bày */
export const thankYouStep: DemoStep<DemoStepContext> = {
  id: 'thank-you',
  async run(ctx) {
    ctx.setStepData(null);
    await sleep(DEMO_STEP_TRANSITION_MS * 2);
  },
};
