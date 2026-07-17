import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('bắt đầu ở trạng thái CLOSED, cho phép request', () => {
    const breaker = new CircuitBreaker(3, 1000);
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canRequest()).toBe(true);
  });

  it('mở mạch (OPEN) sau khi đạt ngưỡng lỗi liên tiếp', () => {
    const breaker = new CircuitBreaker(3, 10_000);
    breaker.onFailure();
    breaker.onFailure();
    expect(breaker.getState()).toBe('CLOSED');
    breaker.onFailure(); // lỗi thứ 3 -> chạm ngưỡng
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canRequest()).toBe(false);
  });

  it('thành công giữa chừng sẽ reset bộ đếm lỗi', () => {
    const breaker = new CircuitBreaker(3, 10_000);
    breaker.onFailure();
    breaker.onFailure();
    breaker.onSuccess();
    breaker.onFailure();
    breaker.onFailure();
    expect(breaker.getState()).toBe('CLOSED'); // mới 2 lỗi liên tiếp kể từ lần thành công
  });

  it('chuyển OPEN -> HALF_OPEN sau resetTimeoutMs, rồi CLOSED nếu thành công', async () => {
    const breaker = new CircuitBreaker(1, 50); // reset rất nhanh để test
    breaker.onFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canRequest()).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    expect(breaker.canRequest()).toBe(true); // tự chuyển HALF_OPEN
    expect(breaker.getState()).toBe('HALF_OPEN');

    breaker.onSuccess();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('HALF_OPEN thất bại thì quay lại OPEN ngay (không cần đủ ngưỡng)', async () => {
    const breaker = new CircuitBreaker(5, 50);
    breaker.onFailure();
    breaker.onFailure();
    breaker.onFailure();
    breaker.onFailure();
    breaker.onFailure(); // đạt ngưỡng 5 -> OPEN
    expect(breaker.getState()).toBe('OPEN');

    await new Promise((r) => setTimeout(r, 60));
    expect(breaker.canRequest()).toBe(true); // HALF_OPEN

    breaker.onFailure(); // 1 lỗi duy nhất ở HALF_OPEN đã đủ để mở lại
    expect(breaker.getState()).toBe('OPEN');
  });
});
