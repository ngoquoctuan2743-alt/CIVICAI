import { apiFetch } from '../lib/api-client';

export interface HealthStatus {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  ready: boolean;
  checks: { database: 'ok' | 'error'; aiService: 'ok' | 'error' };
  aiProvider: string | null;
  embeddingModel: string | null;
}

export const systemService = {
  getHealth: () => apiFetch<HealthStatus>('/health', { skipAuth: true }),
};
