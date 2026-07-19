'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { CardListSkeleton } from '../../../../components/ui/Skeleton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Input } from '../../../../components/ui/Input';
import { ApiClientError } from '../../../../lib/api-error';
import {
  KnowledgeDocument,
  KnowledgeDocumentCategory,
  knowledgeDocumentsAdminService,
} from '../../../../services/knowledge-documents-admin.service';
import { useToast } from '../../../../stores/toast-context';

const CATEGORIES: KnowledgeDocumentCategory[] = [
  'LEGAL_DOCUMENT',
  'PROCEDURE',
  'FAQ',
  'CIRCULAR',
  'DECREE',
  'FORM',
  'AGENCY_INFO',
  'OTHER',
];

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  COMPLETED: 'green',
  NEW: 'amber',
  PROCESSING: 'amber',
  FAILED: 'red',
};

/**
 * Quản lý tài liệu kho tri thức (RAG) — trước đây chưa có trang nào ở
 * frontend cho pipeline ingestion/chunking/embedding đã xây ở backend. Dùng
 * lại đúng API admin đã có sẵn (POST /admin/knowledge-documents, GET list).
 */
export default function AdminDocumentsPage() {
  const { show } = useToast();
  const [items, setItems] = useState<KnowledgeDocument[] | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeDocumentCategory>('CIRCULAR');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reload() {
    setItems(null);
    knowledgeDocumentsAdminService
      .findAll({ limit: 50 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }

  useEffect(reload, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !title.trim()) {
      show('Cần chọn file và nhập tiêu đề', 'error');
      return;
    }
    setIsUploading(true);
    try {
      await knowledgeDocumentsAdminService.uploadOne({ file, title, category });
      show('Đã tải lên — parsing/chunking/embedding sẽ chạy tự động', 'success');
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Có lỗi xảy ra', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleUpload} className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Tiêu đề</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên tài liệu" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Loại</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as KnowledgeDocumentCategory)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">File</label>
          <input ref={fileInputRef} type="file" className="text-sm" />
        </div>
        <Button type="submit" disabled={isUploading}>
          <Upload size={16} /> {isUploading ? 'Đang tải lên...' : 'Tải lên'}
        </Button>
      </form>

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="Chưa có tài liệu nào" description="Tải lên tài liệu đầu tiên để đưa vào kho tri thức RAG." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                <p className="text-xs text-slate-500">{doc.category}</p>
              </div>
              <Badge tone={STATUS_TONE[doc.status] ?? 'gray'}>{doc.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
