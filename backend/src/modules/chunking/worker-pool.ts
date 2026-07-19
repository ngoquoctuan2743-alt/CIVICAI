import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import type {
  ParsingWorkerInput,
  ParsingWorkerOutput,
  ParsingWorkerRequest,
  ParsingWorkerResponse,
} from './parsing.worker.mjs';

interface PoolSlot {
  worker: Worker;
  busy: boolean;
  pending: Map<string, { resolve: (v: ParsingWorkerOutput) => void; reject: (e: Error) => void }>;
}

const POOL_SIZE = 2;
const JOB_TIMEOUT_MS = 60_000;
const WORKER_MAX_OLD_GEN_MB = 512;

/**
 * Pool worker SỐNG LÂU DÀI (persistent) — xem giải thích chi tiết ở đầu
 * `parsing.worker.mts`. Kích thước pool = MAX_CONCURRENCY của queue (mỗi
 * slot xử lý tối đa 1 job cùng lúc) — ChunkProcessingQueueService không
 * cần tự giới hạn concurrency thêm nữa vì pool đã làm việc đó qua
 * `execute()` (chờ tới khi có slot rảnh).
 *
 * `@Injectable()` qua Nest DI (không tự `new` trong service khác) — để
 * unit test mock được toàn bộ pool qua provider override, không vô tình
 * spawn worker_thread thật khi test chỉ muốn kiểm tra logic điều phối.
 *
 * Spawn LƯỜI (lazy) — worker thật chỉ tạo khi `execute()` được gọi lần
 * đầu, không phải lúc constructor — vì vậy khởi tạo NestJS module (kể cả
 * trong test có mock repo nhưng KHÔNG mock WorkerPool) không tốn chi phí
 * tạo thread nếu job đó không thực sự chạy tới bước gọi worker.
 */
@Injectable()
export class WorkerPool {
  private readonly slots: PoolSlot[] = [];
  private readonly waiters: Array<() => void> = [];
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    for (let i = 0; i < POOL_SIZE; i++) {
      this.slots.push(this.spawnSlot());
    }
  }

  private spawnSlot(): PoolSlot {
    const workerPath = join(process.cwd(), 'dist', 'modules', 'chunking', 'parsing.worker.mjs');
    const worker = new Worker(workerPath, {
      resourceLimits: { maxOldGenerationSizeMb: WORKER_MAX_OLD_GEN_MB },
    });
    const slot: PoolSlot = { worker, busy: false, pending: new Map() };

    worker.on('message', (response: ParsingWorkerResponse) => {
      const waiter = slot.pending.get(response.requestId);
      if (!waiter) return;
      slot.pending.delete(response.requestId);
      if (response.ok) waiter.resolve(response);
      else waiter.reject(new Error(response.error));
    });

    const handleFatal = (error: Error) => {
      // Worker chết bất thường (crash/exit khác 0) — reject mọi request đang
      // chờ trên slot này rồi thay thế bằng worker mới, không để pool "kẹt".
      for (const waiter of slot.pending.values()) waiter.reject(error);
      slot.pending.clear();
      const idx = this.slots.indexOf(slot);
      if (idx >= 0) this.slots[idx] = this.spawnSlot();
      this.wakeWaiter();
    };
    worker.on('error', handleFatal);
    worker.on('exit', (code) => {
      if (code !== 0) handleFatal(new Error(`Worker thoát bất thường (mã ${code})`));
    });

    return slot;
  }

  private findIdleSlot(): PoolSlot | undefined {
    return this.slots.find((s) => !s.busy);
  }

  private wakeWaiter(): void {
    const next = this.waiters.shift();
    if (next) next();
  }

  private async acquireSlot(): Promise<PoolSlot> {
    this.ensureInitialized();
    const idle = this.findIdleSlot();
    if (idle) return idle;
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    return this.acquireSlot();
  }

  /**
   * Gửi 1 job cho worker rảnh trong pool, chờ kết quả (có timeout).
   * `signal` (tùy chọn) cho phép hủy job đang chạy từ bên ngoài (Admin API
   * cancel) — khi abort, terminate worker của đúng slot đang xử lý job này
   * (worker sẽ được respawn tự động qua handler 'exit' đã đăng ký).
   */
  async execute(input: ParsingWorkerInput, signal?: AbortSignal): Promise<ParsingWorkerOutput> {
    if (signal?.aborted) throw new Error('Đã bị hủy trước khi worker rảnh để xử lý');
    const slot = await this.acquireSlot();
    slot.busy = true;
    const requestId = randomUUID();

    try {
      return await new Promise<ParsingWorkerOutput>((resolve, reject) => {
        const timeout = setTimeout(() => {
          slot.pending.delete(requestId);
          reject(new Error(`Parsing vượt quá thời gian tối đa ${JOB_TIMEOUT_MS}ms`));
          // Không tin tưởng worker còn ở trạng thái tốt sau timeout — thay mới để an toàn
          void slot.worker.terminate();
        }, JOB_TIMEOUT_MS);

        const onAbort = () => {
          slot.pending.delete(requestId);
          clearTimeout(timeout);
          reject(new Error('Bị hủy thủ công'));
          void slot.worker.terminate();
        };
        signal?.addEventListener('abort', onAbort, { once: true });

        slot.pending.set(requestId, {
          resolve: (v) => {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            resolve(v);
          },
          reject: (e) => {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            reject(e);
          },
        });

        const request: ParsingWorkerRequest = { requestId, input };
        slot.worker.postMessage(request);
      });
    } finally {
      slot.busy = false;
      this.wakeWaiter();
    }
  }

  async destroy(): Promise<void> {
    await Promise.all(this.slots.map((s) => s.worker.terminate()));
  }
}
