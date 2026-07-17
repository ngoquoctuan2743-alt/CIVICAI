'use client';

import { useEffect, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { ProcedureCard } from '../../../components/procedures/ProcedureCard';
import { CardListSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { proceduresService } from '../../../services/procedures.service';
import type { AdministrativeProcedure } from '../../../types/api';

/** Danh sách + tìm kiếm thủ tục hành chính (NHIỆM VỤ 6) */
export default function ProceduresPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [items, setItems] = useState<AdministrativeProcedure[] | null>(null);

  useEffect(() => {
    setItems(null);
    proceduresService
      .findAll({ search: debouncedSearch, limit: 30 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, [debouncedSearch]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Thủ tục hành chính</h1>
      <p className="mb-5 text-sm text-slate-500">Tra cứu hồ sơ, các bước và thời gian xử lý.</p>

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã thủ tục (vd: căn cước, hộ chiếu...)" />
      </div>

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={FileSearch} title="Không tìm thấy thủ tục phù hợp" description="Thử từ khóa khác hoặc hỏi trực tiếp trợ lý AI." />
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
