import { apiFetch } from '../lib/api-client';

export interface EmbeddingProviderHealth {
  reachable: boolean;
  latencyMs: number;
  error: string | null;
  modelName: string;
  modelVersion: string;
}

export const embeddingAdminService = {
  getProviderHealth: () => apiFetch<EmbeddingProviderHealth>('/admin/embedding-jobs/provider-health'),
};
