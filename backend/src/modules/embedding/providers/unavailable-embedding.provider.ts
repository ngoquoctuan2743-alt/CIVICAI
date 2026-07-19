import { EmbeddingProvider, EmbeddingVector } from './embedding-provider.interface';

/**
 * Placeholder cho provider CHƯA có adapter thật (openai/voyage/jina/bge/
 * local) — giữ chỗ trong registry để kiến trúc sẵn sàng mở rộng đúng yêu
 * cầu "The architecture must support future providers", không triển khai
 * thật ở Prompt 04. Cùng tinh thần `NotImplementedAdapter` (LLM, Python) và
 * `OcrParserStub` (Prompt 03).
 */
export class UnavailableEmbeddingProvider implements EmbeddingProvider {
  readonly modelVersion = 'unavailable';
  readonly dimension = 0;

  constructor(readonly modelName: string) {}

  async embedBatch(): Promise<EmbeddingVector[]> {
    throw new Error(
      `Embedding provider "${this.modelName}" đã đăng ký trong registry nhưng chưa có adapter thật. ` +
        `Viết provider mới implement EmbeddingProvider rồi đăng ký vào embedding-provider.registry.ts.`,
    );
  }

  async healthCheck() {
    return { reachable: false, latencyMs: 0, error: `Provider "${this.modelName}" chưa triển khai` };
  }
}
