'use client';

import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { LegalDocCard } from '../../../components/legal/LegalDocCard';
import { CardListSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { legalService } from '../../../services/legal.service';
import type { LegalDocument } from '../../../types/api';

const DOC_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'LUAT', label: 'Luật' },
  { value: 'NGHI_DINH', label: 'Nghị định' },
  { value: 'THONG_TU', label: 'Thông tư' },
  { value: 'QUYET_DINH', label: 'Quyết định' },
];

/** Tra cứu văn bản pháp luật: Luật / Nghị định / Thông tư (NHIỆM VỤ 7) */
export default function LegalSearchPage() {
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [items, setItems] = useState<LegalDocument[] | null>(null);

  useEffect(() => {
    setItems(null);
    legalService
      .findAll({ search: debouncedSearch, docType: docType || undefined, limit: 30 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, [debouncedSearch, docType]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Tra cứu pháp luật</h1>
      <p className="mb-5 text-sm text-slate-500">Luật, Nghị định, Thông tư liên quan đến dịch vụ công.</p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo tiêu đề hoặc số hiệu văn bản..." />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setDocType(t.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                docType === t.value ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {items === null ? (
        <CardListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={Scale} title="Không tìm thấy văn bản phù hợp" description="Thử từ khóa hoặc bộ lọc khác." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((doc) => (
            <LegalDocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
