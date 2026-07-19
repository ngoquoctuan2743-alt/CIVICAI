import type { ProcedureRequirement } from '../../../../types/api';

/** Điều kiện áp dụng — dữ liệu thật từ procedure.requirements (requirementType = 'CONDITION') */
export function ConditionsList({ items }: { items: ProcedureRequirement[] }) {
  const conditions = items.filter((r) => r.requirementType === 'CONDITION').sort((a, b) => a.sortOrder - b.sortOrder);
  if (conditions.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Điều kiện áp dụng</p>
      <ul className="flex flex-col gap-1.5">
        {conditions.map((r) => (
          <li key={r.id} className="flex items-start gap-2 text-sm text-slate-200">
            <span className="mt-0.5 text-emerald-400">•</span>
            <span>
              {r.name}
              {r.note && <span className="block text-xs text-slate-500">{r.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
