import { apiFetch } from '../lib/api-client';
import type {
  AdministrativeProcedure,
  DashboardSummary,
  GovernmentAgency,
  LegalDocument,
  PaginatedResult,
} from '../types/api';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  return qs.toString();
}

export interface CreateProcedureInput {
  code: string;
  name: string;
  description?: string;
  agencyId?: string;
  onlineLevel?: string;
  feeText?: string;
  processingTimeText?: string;
  legalBasisText?: string;
  status?: string;
}
export type UpdateProcedureInput = Partial<CreateProcedureInput>;

export interface CreateLegalDocumentInput {
  code: string;
  title: string;
  docType: string;
  issuingBody: string;
  issuedDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
  status?: string;
  sourceUrl?: string;
  summary?: string;
}
export type UpdateLegalDocumentInput = Partial<CreateLegalDocumentInput>;

export interface CreateAgencyInput {
  code: string;
  name: string;
  level: string;
  parentId?: string;
  adminUnitId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}
export type UpdateAgencyInput = Partial<CreateAgencyInput>;

/** API quản trị (Dashboard Admin) — mọi hàm yêu cầu token của tài khoản có role ADMIN */
export const adminService = {
  getDashboard: () => apiFetch<DashboardSummary>('/admin/dashboard'),

  procedures: {
    findAll: (params: { search?: string; page?: number; limit?: number } = {}) =>
      apiFetch<PaginatedResult<AdministrativeProcedure>>(
        `/admin/procedures?${buildQuery({ search: params.search, page: params.page ?? 1, limit: params.limit ?? 50 })}`,
      ),
    create: (dto: CreateProcedureInput) =>
      apiFetch<AdministrativeProcedure>('/admin/procedures', { method: 'POST', body: dto }),
    update: (id: string, dto: UpdateProcedureInput) =>
      apiFetch<AdministrativeProcedure>(`/admin/procedures/${id}`, { method: 'PATCH', body: dto }),
    deactivate: (id: string) =>
      apiFetch<AdministrativeProcedure>(`/admin/procedures/${id}`, { method: 'DELETE' }),
  },

  legalDocuments: {
    findAll: (params: { search?: string; page?: number; limit?: number } = {}) =>
      apiFetch<PaginatedResult<LegalDocument>>(
        `/admin/legal/documents?${buildQuery({ search: params.search, page: params.page ?? 1, limit: params.limit ?? 50 })}`,
      ),
    create: (dto: CreateLegalDocumentInput) =>
      apiFetch<LegalDocument>('/admin/legal/documents', { method: 'POST', body: dto }),
    update: (id: string, dto: UpdateLegalDocumentInput) =>
      apiFetch<LegalDocument>(`/admin/legal/documents/${id}`, { method: 'PATCH', body: dto }),
    deactivate: (id: string) =>
      apiFetch<LegalDocument>(`/admin/legal/documents/${id}`, { method: 'DELETE' }),
  },

  agencies: {
    findAll: (params: { search?: string; page?: number; limit?: number } = {}) =>
      apiFetch<PaginatedResult<GovernmentAgency>>(
        `/admin/government/agencies?${buildQuery({ search: params.search, page: params.page ?? 1, limit: params.limit ?? 50 })}`,
      ),
    create: (dto: CreateAgencyInput) =>
      apiFetch<GovernmentAgency>('/admin/government/agencies', { method: 'POST', body: dto }),
    update: (id: string, dto: UpdateAgencyInput) =>
      apiFetch<GovernmentAgency>(`/admin/government/agencies/${id}`, { method: 'PATCH', body: dto }),
    remove: (id: string) =>
      apiFetch<{ message: string }>(`/admin/government/agencies/${id}`, { method: 'DELETE' }),
  },
};
