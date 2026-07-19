/**
 * Rate Limiter cửa sổ trượt (sliding window) — tự viết, không dùng lib
 * ngoài, cùng tinh thần Circuit Breaker/Cache tự viết đã có trong dự án.
 * Dùng để tôn trọng API quota của provider embedding (API quota awareness).
 */
export class SlidingWindowRateLimiter {
  private readonly timestamps: number[] = [];

  constructor(private readonly maxPerMinute: number) {}

  /** Chờ tới khi có "chỗ trống" trong cửa sổ 60s gần nhất rồi mới cho phép gọi tiếp */
  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      while (this.timestamps.length > 0 && now - this.timestamps[0] > 60_000) {
        this.timestamps.shift();
      }
      if (this.timestamps.length < this.maxPerMinute) {
        this.timestamps.push(now);
        return;
      }
      const waitMs = 60_000 - (now - this.timestamps[0]) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}
