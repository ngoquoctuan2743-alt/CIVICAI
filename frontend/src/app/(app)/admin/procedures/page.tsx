'use client';

import { useEffect, useState } from 'react';
import { EyeOff, FileText, Pencil, Plus, X } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { CardListSkeleton } from '../../../../components/ui/Skeleton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Input } from '../../../../components/ui/Input';
import { SearchBar } from '../../../../components/ui/SearchBar';
import { Textarea } from '../../../../components/ui/Textarea';
import { useDebouncedValue } from '../../../../hooks/use-debounced-value';
import { ApiClientError } from '../../../../lib/api-error';
import { adminService, CreateProcedureInput } from '../../../../services/admin.service';
import { useToast } from '../../../../stores/toast-context';
import type { AdministrativeProcedure } from '../../../../types/api';

const EMPTY_FORM: CreateProcedureInput = { code: '', name: '', description: '', feeText: '', processingTimeText: '' };

export default function AdminProceduresPage() {
  const { show } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [items, setItems] = useState<AdministrativeProcedure[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateProcedureInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload() {
    setItems(null);
    adminService.procedures
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

  function startEdit(p: AdministrativeProcedure) {
    setEditingId(p.id);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description ?? '',
      feeText: p.feeText ?? '',
      processingTimeText: p.processingTimeText ?? '',
      legalBasisText: p.legalBasisText ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await adminService.procedures.update(editingId, form);
        show('Đã cập nhật thủ tục', 'success');
      } else {
        await adminService.procedures.create(form);
        show('Đã tạo thủ tục mới', 'success');
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
      await adminService.procedures.deactivate(id);
      show('Đã ẩn thủ tục khỏi tra cứu công khai', 'success');
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Có lỗi xảy ra', 'error');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã thủ tục..." />
        </div>
        <Button onClick={startCreate} size="md">
          <Plus size={16} /> Thêm mới
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{editingId ? 'Sửa thủ tục' : 'Thủ tục mới'}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Đóng" className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Mã thủ tục" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Input label="Tên thủ tục" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Lệ phí" value={form.feeText} onChange={(e) => setForm({ ...form, feeText: e.target.value })} />
            <Input
              label="Thời hạn xử lý"
              value={form.processingTimeText}
              onChange={(e) => setForm({ ...form, processingTimeText: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Mô tả"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button type="submit" isLoading={isSubmitting} className="self-start">
            {editingId ? 'Lưu thay đổi' : 'Tạo thủ tục'}
          </Button>
        </form>
      )}

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="Chưa có thủ tục nào" description="Bấm Thêm mới để tạo thủ tục hành chính đầu tiên." />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{p.name}</p>
                  <Badge tone={p.status === 'ACTIVE' ? 'green' : 'gray'}>{p.status}</Badge>
                </div>
                <p className="text-xs text-slate-500">Mã: {p.code}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" onClick={() => startEdit(p)}>
                  <Pencil size={14} /> Sửa
                </Button>
                {p.status === 'ACTIVE' && (
                  <Button variant="danger" size="sm" onClick={() => void handleDeactivate(p.id)}>
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
