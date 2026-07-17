# Bug List — PHASE 6

## Đã sửa

### BUG-01 (Bảo mật — Đã sửa) File upload chỉ tin mimetype do client khai báo

- **File:** `backend/src/modules/documents/documents.service.ts`
- **Mô tả:** `validateFile()` chỉ kiểm tra `file.mimetype` (giá trị client tự khai trong multipart form), không xác minh nội dung file thật. Có thể giả mạo Content-Type để bypass kiểm tra định dạng.
- **Bằng chứng trước khi sửa:** Upload file `.txt` với header khai `type=image/jpeg` → được backend chấp nhận và chuyển tiếp sang AI Service (chỉ bị AI Service chặn ở bước decode ảnh, không phải do backend).
- **Sửa:** Thêm kiểm tra magic bytes thật (JPEG: `FF D8 FF`, PNG: `89 50 4E 47 0D 0A 1A 0A`, WEBP: `RIFF....WEBP`) trước khi lưu file/gọi AI Service.
- **Verify sau sửa:** File giả mạo → `400 BAD_REQUEST` với thông báo rõ ràng "Nội dung file không khớp định dạng ảnh khai báo". File JPEG thật → vẫn hoạt động bình thường. Regression: 36/36 Jest + 28/28 Pytest vẫn pass.
- **Mức độ:** Trung bình (không phải RCE, nhưng là input validation gap có thể dẫn tới lưu file tùy ý vào storage local hoặc gửi payload không mong muốn sang AI Service).

## Ghi nhận, không sửa trong Phase 6 (không phải bug — hành vi đã thiết kế/đã biết)

### NOTE-01 Chat/OCR/Voice trả kết quả mock

Do chưa có `ANTHROPIC_API_KEY`. Đã ghi nhận từ PHASE 4 (`docs/system-integration.md`, Known Issue #1). RAG search (embedding thật) hoạt động đúng độc lập với phần này.

### NOTE-02 `fullName` chấp nhận input dạng `<script>...</script>` không sanitize

- Xác minh: frontend không có `dangerouslySetInnerHTML` ở đâu; `ChatBubble.tsx` dùng `react-markdown` không kèm `rehype-raw` nên HTML thô trong nội dung không được thực thi; input người dùng luôn render qua JSX (auto-escape).
- **Kết luận: không khai thác được XSS trên frontend hiện tại.** Khuyến nghị (không bắt buộc): sanitize ở tầng API để phòng vệ theo chiều sâu cho các client tương lai (mobile app, admin panel) — đề xuất cân nhắc ở Phase 7/8, không thuộc phạm vi sửa lỗi bắt buộc của Phase 6.

### NOTE-03 Health endpoint (`GET /health`) chỉ là liveness check

Có `TODO` sẵn trong code (`health.controller.ts`) để bổ sung readiness check (DB/AI Service). Việc này trùng với nhiệm vụ HEALTH CHECK/MONITORING đã lên kế hoạch ở Phase 7 — không sửa trùng ở Phase 6 để tránh làm hai lần.

### NOTE-04 ESLint chưa được cấu hình (backend + frontend)

Script `lint` tồn tại trong `package.json` nhưng thiếu file cấu hình (`eslint.config.js`). Không tự thêm cấu hình mới trong Phase 6 vì đây là thay đổi tooling ngoài phạm vi "chỉ sửa lỗi" — đề xuất xin duyệt riêng nếu muốn bổ sung.
