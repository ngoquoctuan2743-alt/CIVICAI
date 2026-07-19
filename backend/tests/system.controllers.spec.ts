import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthController } from '../src/modules/system/health.controller';
import { VersionController } from '../src/modules/system/version.controller';
import { AppLoggerService } from '../src/logger/logger.service';
import { AiClientService } from '../src/modules/ai-client/ai-client.service';

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
  it('trả về trạng thái ok kèm environment, uptime và readiness (PHASE 7)', async () => {
    const mockDataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as unknown as DataSource;
    const mockAiClient = {
      checkHealth: jest.fn().mockResolvedValue({ ok: true, llmProvider: 'gemini', embeddingModel: 'gemini-embedding-001' }),
    } as unknown as AiClientService;

    const controller = new HealthController(
      createMockLogger(),
      createMockConfig({ 'app.env': 'test' }),
      mockDataSource,
      mockAiClient,
    );

    const result = await controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.environment).toBe('test');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    // timestamp phải là ISO 8601 hợp lệ
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    // PHASE 7: readiness check cho Database + AI Service
    expect(result.ready).toBe(true);
    expect(result.checks).toEqual({ database: 'ok', aiService: 'ok' });
    // Demo Mode: aiProvider/embeddingModel thật từ AI Service, không hardcode
    expect(result.aiProvider).toBe('gemini');
    expect(result.embeddingModel).toBe('gemini-embedding-001');
  });

  it('ready=false va bao dung dependency loi khi Database/AI Service khong ket noi duoc', async () => {
    const mockDataSource = {
      query: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as DataSource;
    const mockAiClient = {
      checkHealth: jest.fn().mockResolvedValue({ ok: false, llmProvider: null, embeddingModel: null }),
    } as unknown as AiClientService;

    const controller = new HealthController(
      createMockLogger(),
      createMockConfig({ 'app.env': 'test' }),
      mockDataSource,
      mockAiClient,
    );

    const result = await controller.getHealth();

    expect(result.status).toBe('ok'); // process van song (liveness khong doi)
    expect(result.ready).toBe(false);
    expect(result.checks).toEqual({ database: 'error', aiService: 'error' });
    expect(result.aiProvider).toBeNull();
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
