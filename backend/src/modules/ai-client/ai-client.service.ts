import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppException } from '../../common/exceptions/app.exception';
import { AiServiceConfig } from '../../config/configuration';
import { AppLoggerService } from '../../logger/logger.service';
import { CircuitBreaker } from './circuit-breaker';
import { AiChatHistoryItem, AiOcrResultDto, AiResponseDto, AiSearchResultDto } from './ai-client.types';

/**
 * AiClientService — HTTP Client tới AI Service (NHIỆM VỤ 1, PHASE 4).
 *
 * Đặc tính:
 * - Timeout riêng theo loại tác vụ (chat/document/search).
 * - Retry TỐI ĐA 1 LẦN, CHỈ với lỗi mạng (không retry lỗi nghiệp vụ 4xx/503
 *   xác định, vì lặp lại LLM call tốn chi phí và không sửa được lỗi xác định).
 * - Circuit Breaker: 5 lỗi liên tiếp trong cửa sổ hiện tại -> mở mạch 30s,
 *   trong lúc mở mạch trả lỗi ngay (không chờ timeout) để bảo vệ trải nghiệm.
 * - Mọi lỗi được map về AppException chuẩn — không rơi lỗi thô ra client.
 */
@Injectable()
export class AiClientService {
  private readonly baseUrl: string;
  private readonly config: AiServiceConfig;
  private readonly breaker: CircuitBreaker;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AiClientService.name);
    this.config = configService.getOrThrow<AiServiceConfig>('aiService');
    this.baseUrl = this.config.baseUrl;
    this.breaker = new CircuitBreaker(this.config.circuitBreakerThreshold, this.config.circuitBreakerResetMs);
  }

  /** POST /ai/chat — hội thoại văn bản thường */
  chat(message: string, history: AiChatHistoryItem[]): Promise<AiResponseDto> {
    return this.call<AiResponseDto>('/ai/chat', { message, history }, this.config.chatTimeoutMs);
  }

  /** POST /ai/voice — nhận transcript từ Web Speech API, trả speakable=true */
  voice(transcript: string, history: AiChatHistoryItem[]): Promise<AiResponseDto> {
    return this.call<AiResponseDto>('/ai/voice', { transcript, history }, this.config.chatTimeoutMs);
  }

  /** POST /ai/document — OCR + phân tích ảnh giấy tờ */
  analyzeDocument(imageBase64: string, mediaType: string): Promise<AiOcrResultDto> {
    return this.call<AiOcrResultDto>(
      '/ai/document',
      { imageBase64, mediaType },
      this.config.documentTimeoutMs,
    );
  }

  /** POST /ai/search — tìm kiếm ngữ nghĩa trực tiếp (không qua LLM) */
  search(query: string, topK = 5): Promise<AiSearchResultDto> {
    return this.call<AiSearchResultDto>('/ai/search', { query, topK }, this.config.searchTimeoutMs);
  }

  /**
   * GET /health trên AI Service — dùng cho readiness check của Backend (PHASE 7).
   * Không đi qua Circuit Breaker (đây là kiểm tra hạ tầng, không phải lỗi nghiệp vụ)
   * và không throw — trả boolean để HealthController tự quyết định response.
   */
  async checkHealth(): Promise<boolean> {
    try {
      await firstValueFrom(this.http.get(`${this.baseUrl}/health`, { timeout: 3000 }));
      return true;
    } catch {
      return false;
    }
  }

  private async call<T>(path: string, body: unknown, timeoutMs: number, isRetry = false): Promise<T> {
    if (!this.breaker.canRequest()) {
      this.logger.warn(`Circuit breaker dang OPEN — tu choi goi ${path} ngay lap tuc`);
      throw AppException.serviceUnavailable(
        'Dịch vụ AI đang gián đoạn tạm thời (circuit breaker). Vui lòng thử lại sau ít phút.',
      );
    }

    const startedAt = Date.now();
    try {
      const response = await firstValueFrom(
        this.http.post<T>(`${this.baseUrl}${path}`, body, { timeout: timeoutMs }),
      );
      this.breaker.onSuccess();
      this.logger.log(`AI ${path} thanh cong trong ${Date.now() - startedAt}ms`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: unknown }>;
      const isNetworkError = !axiosError.response; // không có response = lỗi mạng/timeout, không phải lỗi nghiệp vụ

      if (isNetworkError && !isRetry) {
        this.logger.warn(`AI ${path} loi mang (${axiosError.code ?? axiosError.message}) — thu lai 1 lan`);
        return this.call<T>(path, body, timeoutMs, true);
      }

      this.breaker.onFailure();
      const elapsed = Date.now() - startedAt;
      this.logger.error(
        `AI ${path} that bai sau ${elapsed}ms (circuit=${this.breaker.getState()}): ${axiosError.message}`,
      );
      throw this.mapError(axiosError, path);
    }
  }

  private mapError(error: AxiosError<{ detail?: unknown }>, path: string): AppException {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const detailMessage = typeof detail === 'string' ? detail : undefined;

    if (status === 422) {
      return AppException.badRequest(detailMessage ?? 'Dữ liệu gửi tới AI service không hợp lệ');
    }
    if (status === 400 || status === 404) {
      return AppException.badRequest(detailMessage ?? `Yêu cầu AI service không hợp lệ (${path})`);
    }
    // 503 (thiếu API key...), 5xx bất kỳ, hoặc lỗi mạng sau khi đã retry
    return AppException.serviceUnavailable(
      detailMessage ?? `Dịch vụ AI tạm thời không phản hồi (${path}). Vui lòng thử lại sau.`,
    );
  }
}
