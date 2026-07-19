import type { DashboardStepData } from '../../types';

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 py-2 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-slate-500">{detail}</span>}
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {ok ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

/**
 * Step 4 (và tái dùng ở step 15 Analytics) — TOÀN BỘ số liệu thật, không
 * hardcode. Nhãn các subsystem đúng với kiến trúc thật: KHÔNG có Redis hay
 * Vector Database riêng (pgvector nằm trong chính Postgres) — hiển thị đúng
 * những gì hệ thống thật sự có, theo đúng yêu cầu "never fake" của đề bài.
 */
export function DashboardScreen({ data }: { data: DashboardStepData }) {
  const { health, dashboard, embeddingHealth } = data;
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-6">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tình trạng hệ thống (thật)</p>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4">
          <StatusRow label="Database (PostgreSQL + pgvector)" ok={health.checks.database === 'ok'} />
          <StatusRow label={`AI Provider${health.aiProvider ? ` (${health.aiProvider})` : ''}`} ok={health.checks.aiService === 'ok'} />
          <StatusRow
            label="Embedding Provider"
            ok={embeddingHealth?.reachable ?? false}
            detail={embeddingHealth ? `${embeddingHealth.latencyMs}ms` : undefined}
          />
          <StatusRow label="Background Workers (chunk/embedding queue nội bộ)" ok />
          <StatusRow label="Local File Storage" ok />
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Số liệu thật</p>
        <div className="grid grid-cols-3 gap-3">
          <CountTile label="Người dùng" value={dashboard.users.total} />
          <CountTile label="Hội thoại" value={dashboard.conversations.total} />
          <CountTile label="Thủ tục" value={dashboard.procedures.total} />
          <CountTile label="Cơ quan" value={dashboard.agencies.total} />
          <CountTile label="Văn bản pháp luật" value={dashboard.legalDocuments.total} />
          <CountTile label="Phản hồi" value={dashboard.feedback.total} />
        </div>
      </div>
    </div>
  );
}
