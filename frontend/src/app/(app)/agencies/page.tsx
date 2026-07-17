'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { AgencyCard } from '../../../components/agencies/AgencyCard';
import { CardListSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { agenciesService } from '../../../services/agencies.service';
import type { GovernmentAgency } from '../../../types/api';

/** Tra cứu danh bạ cơ quan nhà nước (NHIỆM VỤ 8) */
export default function AgenciesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [items, setItems] = useState<GovernmentAgency[] | null>(null);

  useEffect(() => {
    setItems(null);
    agenciesService
      .findAll({ search: debouncedSearch, limit: 30 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, [debouncedSearch]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Cơ quan nhà nước</h1>
      <p className="mb-5 text-sm text-slate-500">Tra cứu địa chỉ, số điện thoại, email liên hệ.</p>

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tên cơ quan..." />
      </div>

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={Building2} title="Không tìm thấy cơ quan phù hợp" description="Thử từ khóa khác." />
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
