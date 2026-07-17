import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

function mockContext(ip: string, path: string): ExecutionContext {
  const request = { ip, method: 'POST', path, route: { path } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('cho phép request trong giới hạn mặc định, chặn khi vượt', () => {
    const reflector = { getAllAndOverride: () => ({ points: 3, durationMs: 60_000 }) } as unknown as Reflector;
    const guard = new RateLimitGuard(reflector);
    const ctx = mockContext('1.2.3.4', '/auth/login');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(() => guard.canActivate(ctx)).toThrow(); // request thứ 4 vượt giới hạn 3
  });

  it('giới hạn tính riêng theo IP', () => {
    const reflector = { getAllAndOverride: () => ({ points: 1, durationMs: 60_000 }) } as unknown as Reflector;
    const guard = new RateLimitGuard(reflector);

    expect(guard.canActivate(mockContext('1.1.1.1', '/x'))).toBe(true);
    expect(guard.canActivate(mockContext('2.2.2.2', '/x'))).toBe(true); // IP khác, không bị chặn
    expect(() => guard.canActivate(mockContext('1.1.1.1', '/x'))).toThrow();
  });

  it('giới hạn tính riêng theo route', () => {
    const reflector = { getAllAndOverride: () => ({ points: 1, durationMs: 60_000 }) } as unknown as Reflector;
    const guard = new RateLimitGuard(reflector);

    expect(guard.canActivate(mockContext('1.1.1.1', '/a'))).toBe(true);
    expect(guard.canActivate(mockContext('1.1.1.1', '/b'))).toBe(true); // route khác, không bị chặn
  });
});
