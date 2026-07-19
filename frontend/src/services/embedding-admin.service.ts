import { apiFetch } from '../lib/api-client';
import type { PaginatedResult } from '../types/api';

export interface EmbeddingProviderHealth {
  reachable: boolean;
  latencyMs: number;
  error: string | null;
  modelName: string;
  modelVersion: string;
}

export type EmbeddingJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'RETRYING' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED';

export interface EmbeddingJob {
  id: string;
  documentId: string;
  documentVersionId: string;
  status: EmbeddingJobStatus;
  attempts: number;
  totalChunks: number;
  embeddedCount: number;
  failedCount: number;
  errorReason: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface EmbeddingMetrics {
  avgEmbeddingLatencyMs: number | null;
  embeddingThroughputPerSec: number | null;
  totalVectors: number;
  failureRate: number;
  totalRetryCount: number;
  avgBatchSize: number | null;
  queueDepth: number;
  deadLetterCount: number;
  estimatedCostUsd: number | null;
}

export const embeddingAdminService = {
  getProviderHealth: () => apiFetch<EmbeddingProviderHealth>('/admin/embedding-jobs/provider-health'),

  metrics: () => apiFetch<EmbeddingMetrics>('/admin/embedding-jobs/metrics'),

  findJobs: (params: { documentId?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    if (params.documentId) qs.set('documentId', params.documentId);
    return apiFetch<PaginatedResult<EmbeddingJob>>(`/admin/embedding-jobs?${qs.toString()}`);
  },

  findJob: (jobId: string) => apiFetch<EmbeddingJob>(`/admin/embedding-jobs/${jobId}`),
};
