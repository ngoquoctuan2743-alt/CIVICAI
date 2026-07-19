import type { ProcedureRequirement } from '../../../../types/api';

/** Checklist giấy tờ cần chuẩn bị — dữ liệu thật từ procedure.requirements (requirementType = 'DOCUMENT') */
export function Checklist({ items }: { items: ProcedureRequirement[] }) {
  const documents = items.filter((r) => r.requirementType === 'DOCUMENT').sort((a, b) => a.sortOrder - b.sortOrder);
  if (documents.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Giấy tờ cần chuẩn bị</p>
      <ul className="flex flex-col gap-1.5">
        {documents.map((r) => (
          <li key={r.id} className="flex items-start gap-2 text-sm text-slate-200">
            <span className="mt-0.5 text-blue-400">☐</span>
            <span>
              {r.name}
              {r.quantity > 1 && <span className="text-slate-500"> ×{r.quantity}</span>}
              {r.note && <span className="block text-xs text-slate-500">{r.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
