import { ConfigService } from '@nestjs/config';
import { HealthController } from '../src/modules/system/health.controller';
import { VersionController } from '../src/modules/system/version.controller';
import { AppLoggerService } from '../src/logger/logger.service';

/**
 * Unit test cho các endpoint hệ thống (health/version).
 * Mock logger + config, không cần khởi động NestJS thật.
 */

/** Tạo mock AppLoggerService tối thiểu */
function createMockLogger(): AppLoggerService {
  return {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as AppLoggerService;
}

/** Tạo mock ConfigService trả giá trị theo map cho trước */
function createMockConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => values[key] ?? defaultValue),
  } as unknown as ConfigService;
}

describe('HealthController', () => {
  it('trả về trạng thái ok kèm environment và uptime', () => {
    const controller = new HealthController(
      createMockLogger(),
      createMockConfig({ 'app.env': 'test' }),
    );

    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.environment).toBe('test');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    // timestamp phải là ISO 8601 hợp lệ
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});

describe('VersionController', () => {
  it('trả về đúng name/version/environment từ config', () => {
    const controller = new VersionController(
      createMockLogger(),
      createMockConfig({
        'app.name': 'CIVICAI Backend',
        'app.version': '0.1.0',
        'app.env': 'test',
      }),
    );

    expect(controller.getVersion()).toEqual({
      name: 'CIVICAI Backend',
      version: '0.1.0',
      environment: 'test',
    });
  });
});
