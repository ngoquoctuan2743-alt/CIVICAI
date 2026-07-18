import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { appendFileSync } from 'node:fs';

const LOG_FILE = 'C:\\Users\\Admin\\AppData\\Local\\Temp\\trivial-worker-direct.log';
function log(msg: string) {
  appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
}

function runTrivialWorker(): Promise<{ ok: boolean }> {
  return new Promise((resolvePromise, reject) => {
    const workerPath = join(__dirname, 'trivial-worker-repro.mjs');
    const worker = new Worker(workerPath);
    worker.once('message', (m) => resolvePromise(m));
    worker.once('error', (e) => reject(e));
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`exit code ${code}`));
    });
  });
}

describe('Trivial multi worker repro (debug only)', () => {
  it('spawn 12 worker TRIVIAL (khong pdf-parse) lien tiep', async () => {
    log('=== BAT DAU ===');
    for (let i = 0; i < 12; i++) {
      log(`truoc lan ${i}`);
      const result = await runTrivialWorker();
      log(`sau lan ${i}: ok=${result.ok}`);
      expect(result.ok).toBe(true);
    }
    log('=== KET THUC ===');
  }, 60000);
});
