'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { AgencyCard } from '../../../components/agencies/AgencyCard';
import { CardListSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { agenciesService } from '../../../services/agencies.service';
import type { AdministrativeUnit, GovernmentAgency } from '../../../types/api';

const selectClass =
  'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30';

/** Tra cứu danh bạ cơ quan nhà nước, lọc theo địa phương (NHIỆM VỤ 8) */
export default function AgenciesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [provinceId, setProvinceId] = useState('');
  const [items, setItems] = useState<GovernmentAgency[] | null>(null);
  const [provinces, setProvinces] = useState<AdministrativeUnit[]>([]);

  useEffect(() => {
    agenciesService.findProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    setItems(null);
    agenciesService
      .findAll({ search: debouncedSearch, provinceId: provinceId || undefined, limit: 30 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, [debouncedSearch, provinceId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Cơ quan nhà nước</h1>
      <p className="mb-5 text-sm text-slate-500">Tra cứu địa chỉ, số điện thoại, email, giờ làm việc.</p>

      <div className="mb-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tên cơ quan..." />
      </div>

      <div className="mb-5">
        <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className={selectClass} aria-label="Lọc theo địa phương">
          <option value="">Mọi địa phương</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={Building2} title="Không tìm thấy cơ quan phù hợp" description="Thử từ khóa hoặc bộ lọc khác." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}
    </div>
  );
}
