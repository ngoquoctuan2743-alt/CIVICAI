import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { appendFileSync } from 'node:fs';

const LOG_FILE = 'C:\\Users\\Admin\\AppData\\Local\\Temp\\persistent-worker-direct.log';
function log(msg: string) {
  appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
}

describe('Persistent worker repro (debug only)', () => {
  it('1 worker song lau, xu ly 12 lan parse PDF qua message', async () => {
    const workerPath = join(__dirname, 'persistent-worker-repro.mjs');
    const worker = new Worker(workerPath);
    const garbage = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('garbage '.repeat(50))]);
    const dataBase64 = garbage.toString('base64');

    log('=== BAT DAU (1 worker, 12 message) ===');
    try {
      for (let i = 0; i < 12; i++) {
        log(`truoc message ${i}`);
        const result = await new Promise((resolvePromise, reject) => {
          const handler = (m: any) => {
            if (m.id === i) {
              worker.off('message', handler);
              resolvePromise(m);
            }
          };
          worker.on('message', handler);
          worker.postMessage({ id: i, dataBase64 });
        });
        log(`sau message ${i}: ${JSON.stringify(result)}`);
      }
      log('=== KET THUC OK ===');
    } finally {
      await worker.terminate();
    }
  }, 60000);
});
