/**
 * Circuit Breaker tối giản (Closed → Open → Half-Open) — bảo vệ hệ thống
 * khi AI Service gián đoạn kéo dài, tránh chờ timeout lặp lại vô ích.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureAt = 0;

  constructor(
    private readonly threshold: number,
    private readonly resetTimeoutMs: number,
  ) {}

  /** Có cho phép gửi request hay không (tự chuyển OPEN -> HALF_OPEN khi hết thời gian nghỉ) */
  canRequest(): boolean {
    if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
      return true;
    }
    if (Date.now() - this.lastFailureAt >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
      return true;
    }
    return false;
  }

  onSuccess(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }

  onFailure(): void {
    this.failureCount += 1;
    this.lastFailureAt = Date.now();
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
