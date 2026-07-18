import { apiFetch } from '../lib/api-client';
import type { AdministrativeUnit, GovernmentAgency, PaginatedResult } from '../types/api';

export const agenciesService = {
  findAll: (
    params: { search?: string; level?: string; provinceId?: string; page?: number; limit?: number } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.level) qs.set('level', params.level);
    if (params.provinceId) qs.set('provinceId', params.provinceId);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return apiFetch<PaginatedResult<GovernmentAgency>>(`/government/agencies?${qs.toString()}`);
  },

  findOne: (id: string) => apiFetch<GovernmentAgency>(`/government/agencies/${id}`),

  findProvinces: () => apiFetch<AdministrativeUnit[]>('/government/provinces'),
};
