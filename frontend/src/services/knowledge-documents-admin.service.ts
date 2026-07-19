import { apiFetch } from '../lib/api-client';
import type { PaginatedResult } from '../types/api';

export type KnowledgeDocumentCategory =
  | 'LEGAL_DOCUMENT'
  | 'PROCEDURE'
  | 'FAQ'
  | 'CIRCULAR'
  | 'DECREE'
  | 'FORM'
  | 'AGENCY_INFO'
  | 'OTHER';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeDocumentCategory;
  status: string;
  activeVersionId: string | null;
  createdAt: string;
}

export interface UploadKnowledgeDocumentInput {
  file: File;
  title: string;
  category: KnowledgeDocumentCategory;
  source?: string;
}

export const knowledgeDocumentsAdminService = {
  findAll: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    return apiFetch<PaginatedResult<KnowledgeDocument>>(`/admin/knowledge-documents?${qs.toString()}`);
  },

  uploadOne: (input: UploadKnowledgeDocumentInput) => {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('title', input.title);
    formData.append('category', input.category);
    if (input.source) formData.append('source', input.source);
    return apiFetch<KnowledgeDocument>('/admin/knowledge-documents', { method: 'POST', body: formData });
  },
};
