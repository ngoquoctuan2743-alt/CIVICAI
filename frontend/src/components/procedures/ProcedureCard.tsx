import Link from 'next/link';
import { Building2, Clock, FileText } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { AdministrativeProcedure } from '../../types/api';

/** Card thủ tục — dùng trong danh sách (NHIỆM VỤ 6) */
export function ProcedureCard({ procedure }: { procedure: AdministrativeProcedure }) {
  return (
    <Link
      href={`/procedures/${procedure.id}`}
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-slate-800">{procedure.name}</h3>
        <Badge tone="blue" className="shrink-0">{procedure.code}</Badge>
      </div>
      {procedure.description && <p className="line-clamp-2 text-sm text-slate-500">{procedure.description}</p>}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {procedure.agency && (
          <span className="flex items-center gap-1">
            <Building2 size={13} /> {procedure.agency.name}
          </span>
        )}
        {procedure.processingTimeText && (
          <span className="flex items-center gap-1">
            <Clock size={13} /> {procedure.processingTimeText}
          </span>
        )}
      </div>
    </Link>
  );
}
