import { apiFetch } from '../lib/api-client';
import type { PaginatedResult } from '../types/api';

export type ChunkProcessingStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELLED';

export interface ChunkProcessingJob {
  id: string;
  documentId: string;
  documentVersionId: string;
  status: ChunkProcessingStatus;
  attempts: number;
  chunksProduced: number | null;
  durationMs: number | null;
  errorReason: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ChunkMetrics {
  avgParsingDurationMs: number | null;
  totalChunks: number;
  avgChunkSizeChars: number | null;
  parserFailureCount: number;
  totalRetryCount: number;
  avgQueueLatencyMs: number | null;
}

export const chunkingAdminService = {
  findJobs: (params: { documentVersionId?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    if (params.documentVersionId) qs.set('documentVersionId', params.documentVersionId);
    return apiFetch<PaginatedResult<ChunkProcessingJob>>(`/admin/chunk-processing-jobs?${qs.toString()}`);
  },

  findJob: (jobId: string) => apiFetch<ChunkProcessingJob>(`/admin/chunk-processing-jobs/${jobId}`),

  metrics: () => apiFetch<ChunkMetrics>('/admin/chunk-processing-jobs/metrics'),
};
