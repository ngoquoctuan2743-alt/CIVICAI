/**
 * Provider Abstraction cho Embedding — interface DUY NHẤT mà phần còn lại
 * của hệ thống (EmbeddingQueueService...) được phép dùng. Không bao giờ
 * import trực tiếp SDK của 1 nhà cung cấp cụ thể (Gemini/OpenAI/...) bên
 * ngoài thư mục `providers/` — đổi provider = viết class mới implement
 * interface này + đăng ký ở `embedding-provider.registry.ts`, không sửa
 * business logic. Cùng tinh thần với `LlmClient` (Adapter Pattern) bên
 * ai-service Python.
 */
export interface EmbeddingVector {
  values: number[];
  /** Token thật đã dùng cho input này — phục vụ Observability (token usage/cost) */
  tokenCount: number | null;
}

export interface EmbeddingProvider {
  /** Tên provider — lưu vào cột `embedding_model` để truy vết (Embedding Versioning) */
  readonly modelName: string;
  /** Version cụ thể của model — vd API version, hoặc ngày phát hành */
  readonly modelVersion: string;
  readonly dimension: number;

  /** Embed nhiều đoạn text cùng lúc (Batch processing) — thứ tự kết quả khớp thứ tự input */
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;

  /** Kiểm tra provider còn gọi được không (Admin API health/observability) */
  healthCheck(): Promise<{ reachable: boolean; latencyMs: number; error: string | null }>;
}
