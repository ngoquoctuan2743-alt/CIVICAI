/** Lỗi API chuẩn hóa — bọc lại error từ response {success:false, error:{...}} của Backend */
export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
