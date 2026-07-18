'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { ProcedureCard } from '../../../components/procedures/ProcedureCard';
import { CardListSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { agenciesService } from '../../../services/agencies.service';
import { proceduresService } from '../../../services/procedures.service';
import type { AdministrativeProcedure, AdministrativeUnit } from '../../../types/api';

const LEVEL_OPTIONS = [
  { value: '', label: 'Mọi cấp' },
  { value: 'CENTRAL', label: 'Trung ương' },
  { value: 'PROVINCE', label: 'Tỉnh/Thành' },
  { value: 'WARD', label: 'Xã/Phường' },
];

const selectClass =
  'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30';

/** Danh sách + tìm kiếm + lọc (lĩnh vực/địa phương/cấp) thủ tục hành chính (NHIỆM VỤ 6) */
export default function ProceduresPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [level, setLevel] = useState('');
  const [items, setItems] = useState<AdministrativeProcedure[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<AdministrativeUnit[]>([]);

  // Danh sách lĩnh vực lấy động từ dữ liệu thật (không hard-code) — nạp 1 lần
  useEffect(() => {
    proceduresService.findAll({ limit: 100 }).then((res) => {
      const distinct = Array.from(new Set(res.items.map((p) => p.category).filter((c): c is string => !!c)));
      setCategories(distinct.sort((a, b) => a.localeCompare(b, 'vi')));
    });
    agenciesService.findProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    setItems(null);
    proceduresService
      .findAll({ search: debouncedSearch, category: category || undefined, provinceId: provinceId || undefined, level: level || undefined, limit: 30 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, [debouncedSearch, category, provinceId, level]);

  const hasFilter = useMemo(() => !!(search || category || provinceId || level), [search, category, provinceId, level]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Thủ tục hành chính</h1>
      <p className="mb-5 text-sm text-slate-500">Tra cứu hồ sơ, các bước và thời gian xử lý.</p>

      <div className="mb-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã thủ tục (vd: căn cước, hộ chiếu...)" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} aria-label="Lọc theo lĩnh vực">
          <option value="">Mọi lĩnh vực</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className={selectClass} aria-label="Lọc theo địa phương">
          <option value="">Mọi địa phương</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectClass} aria-label="Lọc theo cấp thực hiện">
          {LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="Không tìm thấy thủ tục phù hợp"
          description={hasFilter ? 'Thử bỏ bớt bộ lọc hoặc từ khóa khác.' : 'Thử từ khóa khác hoặc hỏi trực tiếp trợ lý AI.'}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((p) => (
            <ProcedureCard key={p.id} procedure={p} />
          ))}
        </div>
      )}
    </div>
  );
}
