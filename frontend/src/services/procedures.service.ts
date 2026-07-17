import { apiFetch } from '../lib/api-client';
import type { AdministrativeProcedure, PaginatedResult } from '../types/api';

export const proceduresService = {
  findAll: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return apiFetch<PaginatedResult<AdministrativeProcedure>>(`/procedures?${qs.toString()}`);
  },

  findOne: (id: string) => apiFetch<AdministrativeProcedure>(`/procedures/${id}`),
};
