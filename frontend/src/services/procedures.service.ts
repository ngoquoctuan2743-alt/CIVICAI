import { apiFetch } from '../lib/api-client';
import type { AdministrativeProcedure, PaginatedResult } from '../types/api';

export const proceduresService = {
  findAll: (
    params: {
      search?: string;
      category?: string;
      provinceId?: string;
      level?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.provinceId) qs.set('provinceId', params.provinceId);
    if (params.level) qs.set('level', params.level);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return apiFetch<PaginatedResult<AdministrativeProcedure>>(`/procedures?${qs.toString()}`);
  },

  findOne: (id: string) => apiFetch<AdministrativeProcedure>(`/procedures/${id}`),
};
