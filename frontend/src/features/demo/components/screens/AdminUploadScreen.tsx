import type { AdminUploadStepData } from '../../types';

const PIPELINE_STAGES = ['Upload', 'Parsing', 'Chunking', 'Embedding', 'Vector Index'] as const;

function stageIndex(phase: AdminUploadStepData['phase']): number {
  switch (phase) {
    case 'uploading':
      return 0;
    case 'parsing':
      return 1;
    case 'chunking':
      return 2;
    case 'embedding':
      return 3;
    case 'done':
      return 4;
    default:
      return -1;
  }
}

/** Step 9-12 — thuần render theo stepData thật (job status thật từ backend, không progress bar giả) */
export function AdminUploadScreen({ data }: { data: AdminUploadStepData }) {
  const isFailed = data.phase === 'chunk-failed' || data.phase === 'embedding-failed' || data.phase === 'timeout';
  const active = stageIndex(data.phase);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6 px-6">
      <p className="text-sm uppercase tracking-widest text-slate-400">Admin — Nạp tài liệu mới</p>

      <div className="flex w-full items-center justify-between">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage} className="flex flex-1 flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${
                isFailed && i === active
                  ? 'border-red-500 bg-red-500/20 text-red-300'
                  : i <= active
                    ? 'border-blue-400 bg-blue-500/20 text-blue-200'
                    : 'border-slate-700 text-slate-500'
              }`}
            >
              {i + 1}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{stage}</p>
          </div>
        ))}
      </div>

      {data.phase === 'chunk-failed' && (
        <p className="text-sm text-red-400">Xử lý parsing/chunking thất bại thật: {data.chunkJob.errorReason ?? 'không rõ nguyên nhân'}</p>
      )}
      {data.phase === 'embedding-failed' && (
        <p className="text-sm text-red-400">Xử lý embedding thất bại thật: {data.embeddingJob.errorReason ?? 'không rõ nguyên nhân'}</p>
      )}
      {data.phase === 'timeout' && (
        <p className="text-sm text-amber-400">Vẫn đang xử lý (chưa xong trong thời gian chờ demo) — trạng thái thật, không giả vờ đã hoàn tất.</p>
      )}
      {data.phase === 'done' && (
        <p className="text-sm text-emerald-400">
          Hoàn tất thật: {data.chunkJob.chunksProduced ?? 0} chunk, {data.embeddingJob.embeddedCount}/{data.embeddingJob.totalChunks} vector đã tạo.
        </p>
      )}
    </div>
  );
}
