import { apiFetch } from '../lib/api-client';
import type { DocumentRecord, OcrAnalyzeResult } from '../types/api';

export const documentsService = {
  analyze: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<OcrAnalyzeResult>('/documents/analyze', { method: 'POST', body: formData });
  },

  findMine: () => apiFetch<DocumentRecord[]>('/documents/mine'),
};
