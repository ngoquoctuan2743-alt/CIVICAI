import type { AiSourceItem, DashboardSummary } from '../../types/api';
import type { ChunkMetrics, ChunkProcessingJob } from '../../services/chunking-admin.service';
import type { EmbeddingJob, EmbeddingMetrics, EmbeddingProviderHealth } from '../../services/embedding-admin.service';
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

/**
 * Dữ liệu màn hình Admin Upload (step 9-12). "Parsing" = job đang QUEUED
 * (chuẩn bị đọc file), "Chunking" = job đang RUNNING (đang tách đoạn) —
 * 2 tên gọi trực quan ứng với 2 trạng thái THẬT liên tiếp của CÙNG 1 job
 * (backend không tách 2 job riêng), không phải bịa thêm giai đoạn giả.
 */
export type AdminUploadStepData =
  | { phase: 'uploading' }
  | { phase: 'parsing'; chunkJob: ChunkProcessingJob }
  | { phase: 'chunking'; chunkJob: ChunkProcessingJob }
  | { phase: 'chunk-failed'; chunkJob: ChunkProcessingJob }
  | { phase: 'embedding'; embeddingJob: EmbeddingJob }
  | { phase: 'embedding-failed'; embeddingJob: EmbeddingJob }
  | { phase: 'done'; chunkJob: ChunkProcessingJob; embeddingJob: EmbeddingJob }
  | { phase: 'timeout' };

/**
 * Step 15 Analytics — CHỈ những số liệu có thật từ API (không có "Total
 * Queries"/"Average Response Time" như ví dụ đề bài vì backend không có
 * metric đó — thêm vào sẽ là bịa số, vi phạm đúng nguyên tắc "never fake"
 * mà chính đề bài yêu cầu).
 */
export interface AnalyticsStepData {
  documentCount: number;
  chunkMetrics: ChunkMetrics;
  embeddingMetrics: EmbeddingMetrics;
  embeddingHealth: EmbeddingProviderHealth | null;
}
