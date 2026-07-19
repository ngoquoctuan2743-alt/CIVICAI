import type { ProcedureStep } from '../../../../types/api';

/**
 * Các bước xử lý thủ tục — dữ liệu thật từ procedure.steps, THAY ĐỔI theo
 * từng thủ tục cụ thể (không dùng danh sách 8 bước cố định như bản mô tả
 * gốc, vì backend không có khái niệm "đặt lịch hẹn" và các bước thật khác
 * nhau giữa các thủ tục — dùng danh sách cố định sẽ sai lệch với dữ liệu
 * thật của một số thủ tục).
 */
export function ProcedureTimeline({ steps }: { steps: ProcedureStep[] }) {
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Các bước xử lý thủ tục</p>
      <ol className="flex flex-col gap-2">
        {sorted.map((s, i) => (
          <li key={s.id} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i === sorted.length - 1 ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {s.stepNumber}
            </span>
            <div>
              <p className="text-sm text-slate-200">{s.title}</p>
              {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
