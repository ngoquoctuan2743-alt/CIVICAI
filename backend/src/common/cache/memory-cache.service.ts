import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache in-memory với TTL — dùng cho dữ liệu công khai, đọc nhiều, ít đổi
 * (Government Directory, Legal Documents, Procedures — NHIỆM VỤ 9, PHASE 4).
 *
 * CHỦ ĐỘNG KHÔNG cache dữ liệu cá nhân (profile, conversation, feedback...).
 * Đơn instance, phù hợp demo 1 container; nhiều instance cần store phân tán
 * (Redis) — ghi nhận là Known Issue, không triển khai trong phạm vi demo.
 */
@Injectable()
export class MemoryCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Xóa toàn bộ key có prefix cho trước (dùng khi dữ liệu nguồn thay đổi) */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  size(): number {
    return this.store.size;
  }
}
