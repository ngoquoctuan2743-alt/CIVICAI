import type { AiSourceItem, DashboardSummary } from '../../types/api';
import type { EmbeddingProviderHealth } from '../../services/embedding-admin.service';
import type { HealthStatus } from '../../services/system.service';

/** Dữ liệu đẩy ra màn hình trong lúc chạy 1 bước hỏi-đáp (ask-question step) */
export type ChatSimStepData =
  | { phase: 'typing'; question: string; revealedWordCount: number }
  | { phase: 'workflow'; question: string; activeIndex: number }
  | { phase: 'answer'; question: string; answer: string; revealedWordCount: number }
  | { phase: 'citations'; question: string; answer: string; sources: AiSourceItem[] };

/** Dữ liệu màn hình Dashboard (dùng lại cho step 4 lẫn step 15 Analytics) — toàn bộ số liệu thật */
export interface DashboardStepData {
  health: HealthStatus;
  dashboard: DashboardSummary;
  embeddingHealth: EmbeddingProviderHealth | null;
}
