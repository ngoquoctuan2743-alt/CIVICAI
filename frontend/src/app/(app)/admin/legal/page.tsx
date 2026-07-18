'use client';

import { useEffect, useState } from 'react';
import { EyeOff, Pencil, Plus, Scale, X } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { CardListSkeleton } from '../../../../components/ui/Skeleton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Input } from '../../../../components/ui/Input';
import { SearchBar } from '../../../../components/ui/SearchBar';
import { Textarea } from '../../../../components/ui/Textarea';
import { useDebouncedValue } from '../../../../hooks/use-debounced-value';
import { ApiClientError } from '../../../../lib/api-error';
import { adminService, CreateLegalDocumentInput } from '../../../../services/admin.service';
import { useToast } from '../../../../stores/toast-context';
import type { LegalDocument } from '../../../../types/api';

const DOC_TYPES = ['LUAT', 'NGHI_DINH', 'THONG_TU', 'QUYET_DINH', 'KHAC'];

const EMPTY_FORM: CreateLegalDocumentInput = { code: '', title: '', docType: 'LUAT', issuingBody: '', summary: '' };

export default function AdminLegalPage() {
  const { show } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [items, setItems] = useState<LegalDocument[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLegalDocumentInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload() {
    setItems(null);
    adminService.legalDocuments
      .findAll({ search: debouncedSearch })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }

  useEffect(reload, [debouncedSearch]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(doc: LegalDocument) {
    setEditingId(doc.id);
    setForm({
      code: doc.code,
      title: doc.title,
      docType: doc.docType,
      issuingBody: doc.issuingBody,
      summary: doc.summary ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await adminService.legalDocuments.update(editingId, form);
        show('Đã cập nhật văn bản', 'success');
      } else {
        await adminService.legalDocuments.create(form);
        show('Đã tạo văn bản mới', 'success');
      }
      setShowForm(false);
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Có lỗi xảy ra', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await adminService.legalDocuments.deactivate(id);
      show('Đã loại văn bản khỏi nguồn trích dẫn AI', 'success');
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Có lỗi xảy ra', 'error');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tiêu đề hoặc số hiệu..." />
        </div>
        <Button onClick={startCreate} size="md">
          <Plus size={16} /> Thêm mới
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{editingId ? 'Sửa văn bản' : 'Văn bản mới'}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Đóng" className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Số hiệu" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Input label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Loại văn bản</label>
              <select
                value={form.docType}
                onChange={(e) => setForm({ ...form, docType: e.target.value })}
                className="h-11 rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Cơ quan ban hành"
              value={form.issuingBody}
              onChange={(e) => setForm({ ...form, issuingBody: e.target.value })}
              required
            />
          </div>
          <Textarea placeholder="Tóm tắt nội dung" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <Button type="submit" isLoading={isSubmitting} className="self-start">
            {editingId ? 'Lưu thay đổi' : 'Tạo văn bản'}
          </Button>
        </form>
      )}

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={Scale} title="Chưa có văn bản nào" description="Bấm Thêm mới để tạo văn bản pháp luật đầu tiên." />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{doc.title}</p>
                  <Badge tone={doc.status === 'CON_HIEU_LUC' ? 'green' : 'gray'}>{doc.status}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {doc.code} · {doc.docType} · {doc.issuingBody}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" onClick={() => startEdit(doc)}>
                  <Pencil size={14} /> Sửa
                </Button>
                {doc.status === 'CON_HIEU_LUC' && (
                  <Button variant="danger" size="sm" onClick={() => void handleDeactivate(doc.id)}>
                    <EyeOff size={14} /> Ẩn
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
