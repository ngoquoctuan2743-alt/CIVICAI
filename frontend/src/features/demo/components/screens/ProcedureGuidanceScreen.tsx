import type { GuidancePhaseData } from '../../types';
import { Checklist } from '../ui/Checklist';
import { ConditionsList } from '../ui/ConditionsList';
import { LegalReferenceCard } from '../ui/LegalReferenceCard';
import { NextActionsPanel } from '../ui/NextActionsPanel';
import { ProcedureTimeline } from '../ui/ProcedureTimeline';

/**
 * Extension 01 — hướng dẫn thủ tục thật sau khi AI trả lời, gắn với chính
 * thủ tục AI xác định (procedure.id từ relatedProcedures). Toàn bộ dữ liệu
 * hiển thị đều thật (GET /procedures/:id + GET /legal/documents/:id) —
 * không có phần nào tự bịa.
 */
export function ProcedureGuidanceScreen({ data }: { data: GuidancePhaseData }) {
  const { procedure, sources, legalDetails, nextActions } = data;
  if (!procedure) return null;

  const legalSources = sources.filter((s) => s.sourceType === 'LEGAL_DOCUMENT');

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5 px-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400">Hướng dẫn thủ tục</p>
        <p className="text-lg font-semibold text-white">{procedure.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <Checklist items={procedure.requirements ?? []} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <ConditionsList items={procedure.requirements ?? []} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {procedure.processingTimeText && (
            <div>
              <p className="text-xs text-slate-500">Thời gian xử lý</p>
              <p className="text-slate-200">{procedure.processingTimeText}</p>
            </div>
          )}
          {procedure.feeText && (
            <div>
              <p className="text-xs text-slate-500">Lệ phí</p>
              <p className="text-slate-200">{procedure.feeText}</p>
            </div>
          )}
          {procedure.agency && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Cơ quan xử lý</p>
              <p className="text-slate-200">{procedure.agency.name}</p>
              {procedure.agency.address && <p className="text-xs text-slate-400">{procedure.agency.address}</p>}
              {procedure.agency.workingHours && <p className="text-xs text-slate-400">{procedure.agency.workingHours}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <ProcedureTimeline steps={procedure.steps ?? []} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <NextActionsPanel actions={nextActions} />
      </div>

      {legalSources.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Căn cứ pháp lý</p>
          <ul className="flex flex-col gap-2">
            {legalSources.map((s, i) => (
              <LegalReferenceCard key={`${s.sourceId}-${i}`} source={s} detail={legalDetails[s.sourceId]} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
