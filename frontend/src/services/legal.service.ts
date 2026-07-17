import { apiFetch } from '../lib/api-client';
import type { LegalDocument, PaginatedResult } from '../types/api';

export const legalService = {
  findAll: (params: { search?: string; docType?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.docType) qs.set('docType', params.docType);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return apiFetch<PaginatedResult<LegalDocument>>(`/legal/documents?${qs.toString()}`);
  },

  findOne: (id: string) => apiFetch<LegalDocument>(`/legal/documents/${id}`),
};
