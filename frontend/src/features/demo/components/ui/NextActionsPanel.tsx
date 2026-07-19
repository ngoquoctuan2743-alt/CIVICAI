/** Hành động tiếp theo — dữ liệu thật từ AiResponseDto.suggestedActions (đã có sẵn ở backend, trước đây chưa được đọc ở Demo Mode) */
export function NextActionsPanel({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Hành động tiếp theo</p>
      <ul className="flex flex-col gap-1.5">
        {actions.map((action, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-200">
            <span className="text-amber-400">→</span>
            {action}
          </li>
        ))}
      </ul>
    </div>
  );
}
