import { chunkingAdminService, type ChunkProcessingJob } from '../../../services/chunking-admin.service';
import { embeddingAdminService, type EmbeddingJob } from '../../../services/embedding-admin.service';
import { knowledgeDocumentsAdminService } from '../../../services/knowledge-documents-admin.service';
import { DEMO_JOB_POLL_INTERVAL_MS, DEMO_JOB_POLL_MAX_ATTEMPTS, DEMO_STEP_TRANSITION_MS } from '../config/demo.config';
import { generateDemoDocumentContent } from '../services/demo-data-seeder';
import type { AdminUploadStepData } from '../types';
import type { DemoStep } from './demo-scenario-engine';
import type { DemoStepContext } from './demo-step-context';
import { sleep } from './sleep';

/** Tìm job chunk mới nhất của version vừa upload — upload không trả jobId trực tiếp (enqueue fire-and-forget ở backend) */
async function findLatestChunkJob(documentVersionId: string): Promise<ChunkProcessingJob | null> {
  const { items } = await chunkingAdminService.findJobs({ documentVersionId, page: 1, limit: 1 });
  return items[0] ?? null;
}

async function findLatestEmbeddingJob(documentId: string): Promise<EmbeddingJob | null> {
  const { items } = await embeddingAdminService.findJobs({ documentId, page: 1, limit: 1 });
  return items[0] ?? null;
}

/**
 * Step 9-12 — Upload tài liệu thật + poll trạng thái job chunk/embedding
 * THẬT (không phải progress bar giả định thời gian cố định). Nếu vượt quá
 * DEMO_JOB_POLL_MAX_ATTEMPTS mà vẫn chưa xong, dừng ở phase 'timeout' —
 * đúng yêu cầu đề bài "hiển thị trạng thái thật, không giả vờ thành công".
 */
export const adminUploadStep: DemoStep<DemoStepContext> = {
  id: 'admin-upload',
  async run(ctx) {
    const setData = ctx.setStepData as (d: AdminUploadStepData) => void;
    setData({ phase: 'uploading' });

    const { fileName, content } = generateDemoDocumentContent();
    const file = new File([content], fileName, { type: 'text/plain' });
    const doc = await knowledgeDocumentsAdminService.uploadOne({
      file,
      title: `Thông tư demo — ${fileName}`,
      category: 'CIRCULAR',
    });
    ctx.vars.demoDocumentId = doc.id;
    if (!doc.activeVersionId) {
      setData({ phase: 'timeout' });
      return;
    }
    await sleep(DEMO_STEP_TRANSITION_MS);

    // ---- Poll job chunk: QUEUED -> hiện "Parsing", RUNNING -> hiện "Chunking" ----
    let chunkJob: ChunkProcessingJob | null = null;
    for (let attempt = 0; attempt < DEMO_JOB_POLL_MAX_ATTEMPTS; attempt++) {
      chunkJob = await findLatestChunkJob(doc.activeVersionId);
      if (chunkJob) {
        if (chunkJob.status === 'COMPLETED') break;
        if (chunkJob.status === 'FAILED' || chunkJob.status === 'CANCELLED') {
          setData({ phase: 'chunk-failed', chunkJob });
          return;
        }
        setData({ phase: chunkJob.status === 'RUNNING' ? 'chunking' : 'parsing', chunkJob });
      }
      await sleep(DEMO_JOB_POLL_INTERVAL_MS);
    }
    if (!chunkJob || chunkJob.status !== 'COMPLETED') {
      setData({ phase: 'timeout' });
      return;
    }

    // ---- Poll job embedding: chunk COMPLETED tự động enqueue embedding (hook backend có sẵn) ----
    let embeddingJob: EmbeddingJob | null = null;
    for (let attempt = 0; attempt < DEMO_JOB_POLL_MAX_ATTEMPTS; attempt++) {
      embeddingJob = await findLatestEmbeddingJob(doc.id);
      if (embeddingJob) {
        if (embeddingJob.status === 'COMPLETED') break;
        if (embeddingJob.status === 'FAILED' || embeddingJob.status === 'DEAD_LETTER' || embeddingJob.status === 'CANCELLED') {
          setData({ phase: 'embedding-failed', embeddingJob });
          return;
        }
        setData({ phase: 'embedding', embeddingJob });
      }
      await sleep(DEMO_JOB_POLL_INTERVAL_MS);
    }
    if (!embeddingJob || embeddingJob.status !== 'COMPLETED') {
      setData({ phase: 'timeout' });
      return;
    }

    setData({ phase: 'done', chunkJob, embeddingJob });
    await sleep(DEMO_STEP_TRANSITION_MS * 2);
  },
};
