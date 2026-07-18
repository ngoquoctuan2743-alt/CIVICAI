'use client';

import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { CardListSkeleton } from '../../../../components/ui/Skeleton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Input } from '../../../../components/ui/Input';
import { SearchBar } from '../../../../components/ui/SearchBar';
import { useDebouncedValue } from '../../../../hooks/use-debounced-value';
import { ApiClientError } from '../../../../lib/api-error';
import { adminService, CreateAgencyInput } from '../../../../services/admin.service';
import { useToast } from '../../../../stores/toast-context';
import type { GovernmentAgency } from '../../../../types/api';

const LEVELS = ['CENTRAL', 'PROVINCE', 'WARD'];

const EMPTY_FORM: CreateAgencyInput = { code: '', name: '', level: 'CENTRAL', address: '', phone: '', email: '', website: '' };

export default function AdminAgenciesPage() {
  const { show } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [items, setItems] = useState<GovernmentAgency[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAgencyInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload() {
    setItems(null);
    adminService.agencies
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

  function startEdit(a: GovernmentAgency) {
    setEditingId(a.id);
    setForm({
      code: a.code,
      name: a.name,
      level: a.level,
      address: a.address ?? '',
      phone: a.phone ?? '',
      email: a.email ?? '',
      website: a.website ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await adminService.agencies.update(editingId, form);
        show('Đã cập nhật cơ quan', 'success');
      } else {
        await adminService.agencies.create(form);
        show('Đã tạo cơ quan mới', 'success');
      }
      setShowForm(false);
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Có lỗi xảy ra', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await adminService.agencies.remove(id);
      show('Đã xóa cơ quan', 'success');
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Có lỗi xảy ra', 'error');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã cơ quan..." />
        </div>
        <Button onClick={startCreate} size="md">
          <Plus size={16} /> Thêm mới
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{editingId ? 'Sửa cơ quan' : 'Cơ quan mới'}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Đóng" className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Mã cơ quan" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Input label="Tên cơ quan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Cấp</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="h-11 rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <Button type="submit" isLoading={isSubmitting} className="self-start">
            {editingId ? 'Lưu thay đổi' : 'Tạo cơ quan'}
          </Button>
        </form>
      )}

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={Building2} title="Chưa có cơ quan nào" description="Bấm Thêm mới để tạo cơ quan nhà nước đầu tiên." />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{a.name}</p>
                  <Badge tone="blue">{a.level}</Badge>
                </div>
                <p className="text-xs text-slate-500">Mã: {a.code}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" onClick={() => startEdit(a)}>
                  <Pencil size={14} /> Sửa
                </Button>
                <Button variant="danger" size="sm" onClick={() => void handleRemove(a.id)}>
                  <Trash2 size={14} /> Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
