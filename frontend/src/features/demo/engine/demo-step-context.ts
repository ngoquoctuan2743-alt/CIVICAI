/**
 * DemoStepContext — truyền giữa các DemoStep khi chạy. `setStepData` đẩy dữ
 * liệu thật (câu trả lời AI, trạng thái job...) ra để màn hình hiện tại
 * render; `vars` là chỗ chứa chung để step sau đọc lại kết quả step trước
 * (vd. conversationId tạo ở bước chat, dùng lại ở bước hỏi câu 2) — tránh
 * phải khai phình interface mỗi khi thêm bước mới.
 */
export interface DemoStepContext {
  setStepData: (data: unknown) => void;
  vars: Record<string, unknown>;
}
