import type { AnalyticsStepData } from '../../types';

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

/**
 * Step 15 — số liệu thật từ /admin/chunk-processing-jobs/metrics và
 * /admin/embedding-jobs/metrics. KHÔNG có ô "Total Queries"/"Average
 * Response Time" như ví dụ đề bài vì backend hiện không có metric đó —
 * để trống còn hơn bịa số.
 */
export function AnalyticsScreen({ data }: { data: AnalyticsStepData }) {
  const { documentCount, chunkMetrics, embeddingMetrics, embeddingHealth } = data;
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-6">
      <p className="text-sm uppercase tracking-widest text-slate-400">Analytics — số liệu thật</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Tài liệu đã nạp" value={documentCount} />
        <Tile label="Chunk đã tạo" value={chunkMetrics.totalChunks} />
        <Tile label="Vector đã tạo" value={embeddingMetrics.totalVectors} />
        <Tile label="Job đang chờ (queue)" value={embeddingMetrics.queueDepth} />
        <Tile label="Job lỗi vĩnh viễn" value={embeddingMetrics.deadLetterCount} />
        <Tile label="Tỉ lệ lỗi embedding" value={`${Math.round(embeddingMetrics.failureRate * 100)}%`} />
        <Tile
          label="Độ trễ parsing TB"
          value={chunkMetrics.avgParsingDurationMs != null ? `${Math.round(chunkMetrics.avgParsingDurationMs)}ms` : '—'}
        />
        <Tile
          label="Gemini Embedding"
          value={embeddingHealth?.reachable ? `${embeddingHealth.latencyMs}ms` : 'offline'}
        />
      </div>
    </div>
  );
}
