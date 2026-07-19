import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { AppLoggerService } from '../../../logger/logger.service';
import { EmbeddingConfig } from '../../../config/configuration';
import { EmbeddingProvider, EmbeddingVector } from './embedding-provider.interface';

/** Timeout gọi HTTP tới Gemini Embedding API — không có giới hạn này, 1 request treo (mất mạng/hạ tầng) sẽ chặn CẢ job mãi mãi (đã gặp thật khi test) */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * GeminiEmbeddingProvider — cài đặt EmbeddingProvider trên Gemini Embedding
 * API (model `gemini-embedding-001`, hỗ trợ outputDimensionality tùy chỉnh
 * kiểu Matryoshka — 768 chiều mặc định, cân bằng chất lượng/tốc độ index).
 *
 * SECURITY: log KHÔNG BAO GIỜ chứa nội dung văn bản gốc — chỉ log độ dài,
 * số lượng, request id, thời gian, token usage (đúng yêu cầu "Never log
 * document contents").
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly modelName = 'gemini';
  readonly modelVersion: string;
  readonly dimension: number;
  private readonly client: GoogleGenAI;

  constructor(config: EmbeddingConfig, private readonly logger: AppLoggerService) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY chưa được cấu hình — điền vào backend/.env hoặc đổi EMBEDDING_PROVIDER');
    }
    this.modelVersion = config.geminiModel;
    this.dimension = config.dimension;
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    if (texts.length === 0) return [];
    const requestId = randomUUID();
    const startedAt = Date.now();
    try {
      const result = await this.client.models.embedContent({
        model: this.modelVersion,
        contents: texts,
        config: { outputDimensionality: this.dimension, httpOptions: { timeout: REQUEST_TIMEOUT_MS } },
      });
      const embeddings = result.embeddings ?? [];
      if (embeddings.length !== texts.length) {
        throw new Error(`Gemini trả về ${embeddings.length} vector cho ${texts.length} input — không khớp số lượng`);
      }
      this.logger.log(
        `embed_batch request=${requestId} count=${texts.length} dim=${this.dimension} latency_ms=${Date.now() - startedAt}`,
      );
      return embeddings.map((e) => ({
        values: e.values ?? [],
        tokenCount: null, // Gemini embedContent hiện không trả tokenCount theo item — theo dõi qua usage tổng nếu SDK bổ sung sau
      }));
    } catch (error) {
      const message = this.mapError(error as Error);
      this.logger.error(`embed_batch request=${requestId} count=${texts.length} FAILED: ${message}`);
      throw new Error(message);
    }
  }

  async healthCheck(): Promise<{ reachable: boolean; latencyMs: number; error: string | null }> {
    const startedAt = Date.now();
    try {
      await this.client.models.embedContent({
        model: this.modelVersion,
        contents: 'health check',
        config: { outputDimensionality: this.dimension, httpOptions: { timeout: REQUEST_TIMEOUT_MS } },
      });
      return { reachable: true, latencyMs: Date.now() - startedAt, error: null };
    } catch (error) {
      return { reachable: false, latencyMs: Date.now() - startedAt, error: (error as Error).message };
    }
  }

  /** Ánh xạ lỗi thô của SDK thành thông điệp rõ ràng — KHÔNG bao giờ lộ API key trong message */
  private mapError(error: Error): string {
    const raw = error.message ?? String(error);
    if (/timeout|timed.?out|ETIMEDOUT|deadline.?exceeded/i.test(raw)) {
      return `Gemini Embedding API không phản hồi trong ${REQUEST_TIMEOUT_MS}ms (timeout): ${raw.slice(0, 200)}`;
    }
    if (raw.includes('429') || /quota|rate.?limit/i.test(raw)) {
      return `Gemini Embedding API vượt quota/rate limit: ${raw.slice(0, 200)}`;
    }
    if (raw.includes('401') || raw.includes('403') || /api.?key/i.test(raw)) {
      return 'Gemini Embedding API từ chối xác thực — kiểm tra GEMINI_API_KEY';
    }
    return `Lỗi gọi Gemini Embedding API: ${raw.slice(0, 300)}`;
  }
}
