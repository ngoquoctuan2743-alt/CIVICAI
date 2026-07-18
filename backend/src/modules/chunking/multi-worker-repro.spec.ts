import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { appendFileSync } from 'node:fs';

const LOG_FILE = 'C:\\Users\\Admin\\AppData\\Local\\Temp\\multi-worker-direct.log';
function log(msg: string) {
  appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
}

function runWorkerOnce(withResourceLimits: boolean): Promise<{ ok: boolean }> {
  return new Promise((resolvePromise, reject) => {
    const workerPath = join(process.cwd(), 'dist', 'modules', 'chunking', 'parsing.worker.mjs');
    const input = {
      fileBase64: Buffer.from('Điều 1. Nội dung test.', 'utf-8').toString('base64'),
      fileName: 'test.txt',
      config: { targetChunkSize: 700, maxChunkSize: 1500, overlapSize: 100 },
    };
    const worker = new Worker(workerPath, {
      workerData: input,
      ...(withResourceLimits ? { resourceLimits: { maxOldGenerationSizeMb: 512 } } : {}),
    });
    worker.once('message', (m) => resolvePromise(m));
    worker.once('error', (e) => reject(e));
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`exit code ${code}`));
    });
  });
}

describe('Multi worker spawn repro (debug only)', () => {
  it('spawn 12 worker LIÊN TIẾP với resourceLimits', async () => {
    log('=== BAT DAU TEST (KHONG resourceLimits) ===');
    for (let i = 0; i < 12; i++) {
      log(`truoc lan ${i}`);
      const result = await runWorkerOnce(false);
      log(`sau lan ${i}: ok=${result.ok}`);
      expect(result.ok).toBe(true);
    }
    log('=== KET THUC TEST ===');
  }, 60000);
});
