import { apiFetch } from '../lib/api-client';
import type { GovernmentAgency, PaginatedResult } from '../types/api';

export const agenciesService = {
  findAll: (params: { search?: string; level?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.level) qs.set('level', params.level);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return apiFetch<PaginatedResult<GovernmentAgency>>(`/government/agencies?${qs.toString()}`);
  },

  findOne: (id: string) => apiFetch<GovernmentAgency>(`/government/agencies/${id}`),
};
