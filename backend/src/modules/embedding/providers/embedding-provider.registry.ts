import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingConfig } from '../../../config/configuration';
import { AppLoggerService } from '../../../logger/logger.service';
import { EmbeddingProvider } from './embedding-provider.interface';
import { GeminiEmbeddingProvider } from './gemini-embedding.provider';
import { UnavailableEmbeddingProvider } from './unavailable-embedding.provider';

const KNOWN_PROVIDERS = ['gemini', 'openai', 'voyage', 'jina', 'bge', 'local'] as const;

/**
 * Registry chọn EmbeddingProvider theo cấu hình (EMBEDDING_PROVIDER) —
 * Provider Abstraction. Thêm provider mới thật: viết class implement
 * EmbeddingProvider, thêm case ở `create()`, KHÔNG sửa nơi khác.
 */
@Injectable()
export class EmbeddingProviderRegistry {
  private cached: EmbeddingProvider | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(EmbeddingProviderRegistry.name);
  }

  /** Provider hiện hành theo cấu hình — cache 1 instance (giữ nguyên trạng thái client SDK) */
  get(): EmbeddingProvider {
    if (this.cached) return this.cached;
    const config = this.configService.getOrThrow<EmbeddingConfig>('embedding');
    const provider = (KNOWN_PROVIDERS as readonly string[]).includes(config.provider) ? config.provider : null;
    if (!provider) {
      throw new Error(`EMBEDDING_PROVIDER "${config.provider}" không hợp lệ. Hỗ trợ: ${KNOWN_PROVIDERS.join(', ')}`);
    }
    this.cached = this.create(provider, config);
    return this.cached;
  }

  private create(provider: string, config: EmbeddingConfig): EmbeddingProvider {
    if (provider === 'gemini') return new GeminiEmbeddingProvider(config, this.logger);
    return new UnavailableEmbeddingProvider(provider);
  }
}
