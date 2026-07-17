# VAIC 2026 — QA Report (PHASE 6: System Stabilization)

Ngày thực hiện: 2026-07-18
Người thực hiện: Claude (Principal QA Engineer), xác nhận bởi ngoquoctuan2743@gmail.com
Baseline: commit `5e9b835` / tag `v0.5-baseline`

## Môi trường kiểm thử

| Thành phần | Trạng thái khi kiểm thử |
|---|---|
| PostgreSQL (`vaic-postgres`, port 5433) | Đang chạy, healthy |
| AI Service (`vaic-ai-test`, port 8000) | Đang chạy, `llmProvider=mock` (chưa có `ANTHROPIC_API_KEY`) |
| Backend (port 3100) | Đang chạy (`npm run start:dev`) |
| Frontend (port 3001) | Đang chạy (`npm run dev`) |

## STEP 1 — System Audit

- Cấu trúc dự án đúng README: `frontend/`, `backend/`, `ai-service/`, `database/`, `docs/`.
- `docker-compose.yml` hiện chỉ có service `postgres`; backend/ai-service/frontend/nginx còn là placeholder (đúng thiết kế, sẽ bật ở PHASE 8 theo README — không phải lỗi).
- 19 bảng, 21 foreign key, 26 index trong migration `InitSchema` — khớp mô tả README ("19 bảng").
- `.env.example` (root/backend/ai-service) mô tả đầy đủ biến môi trường.

## STEP 2 — Functional Test (chạy thật, không giả lập)

| Luồng | Kết quả |
|---|---|
| Đăng ký → Đăng nhập | PASS |
| Tạo hội thoại → Chat "Tôi muốn làm Căn cước công dân" | PASS (xem lưu ý mock LLM) |
| RAG semantic search (`/ai/search`) | PASS — top-3 kết quả đúng (thủ tục CC-01, luật 26/2023/QH15...), score 0.88+ |
| Tra cứu thủ tục (`/procedures`) | PASS — 8 thủ tục demo, có agency lồng kèm |
| Tra cứu luật (`/legal/documents`) | PASS — 6 văn bản |
| Tra cứu cơ quan (`/government/agencies`) | PASS — 5 cơ quan, có admin unit |
| OCR upload (`/documents/analyze`) | PASS (mock OCR, xem lưu ý) |
| Voice (channel VOICE qua `/ai/voice`) | PASS — `speakable:true` đúng thiết kế |
| Feedback (👍/👎) | PASS |
| Lịch sử hội thoại / tin nhắn | PASS — phân trang đúng |

**Lưu ý minh bạch (không phải bug hệ thống):** Do chưa cấu hình `ANTHROPIC_API_KEY`, câu trả lời Chat/Voice/OCR đang ở chế độ mock (`intent:"mock"`, `[MOCK OCR]`). Đây là hành vi **đã được thiết kế và ghi nhận từ PHASE 4** (`docs/system-integration.md`), không phải lỗi mới. RAG search (embedding thật) đã verify hoạt động đúng độc lập với LLM.

## STEP 3 — API Validation

- Response format `{success, data|error, meta}` nhất quán trên mọi endpoint đã test.
- `requestId` có mặt trong mọi response (`meta.requestId`) — hỗ trợ truy vết log.
- Auth guard: 401 khi thiếu token, thông báo lỗi đăng nhập generic (không lộ email có tồn tại hay không).
- Validation (`class-validator`): bắt đúng các trường hợp email sai định dạng, mật khẩu yếu, enum sai giá trị (`channel`) — trả `VALIDATION_ERROR` kèm chi tiết field.
- Rate limiting xác nhận hoạt động thật: 10 request/60s đầu trả 401 (sai mật khẩu), request 11-12 trả **429** đúng như cấu hình `@RateLimit({points:10, durationMs:60000})` trên `/auth/login`.

## STEP 4 — Database Validation

- Migration up → down → down → up chạy sạch trên PostgreSQL tạm (container cô lập, không đụng DB demo đang dùng) — không lỗi transaction, không lỗi ràng buộc.
- Cả 3 migration (`InitSchema`, `SeedRoles`, `SeedDemoData`) đều có `up()` và `down()` đầy đủ.
- Seed data: 34 tỉnh/thành (province), 8 thủ tục, 6 văn bản luật, 5 cơ quan — load đúng.

## STEP 5 — AI Validation

- Pytest ai-service: **28/28 PASS** (`test_intent`, `test_chunking`, `test_memory`, `test_rag_pipeline`, `test_chat_workflow`).
- Có test riêng cho hallucination cơ bản: `test_khong_co_nguon_du_diem_khong_bia_thong_tin` (không đủ điểm nguồn → không bịa thông tin) — PASS.
- System Prompt (`ai-service/app/prompt/templates.py`) có điều khoản chống prompt injection tường minh (mục 6: nguyên tắc không thể bị ghi đè bởi nội dung người dùng, kể cả giả danh admin/dev).
- Kiến trúc gọi Claude API dùng đúng tham số `system=` tách biệt với `messages=` (không nối chuỗi system+user) — đúng thông lệ, giảm rủi ro injection.

## STEP 6 — Security Review

Xem chi tiết: [`security-checklist-phase6.md`](security-checklist-phase6.md)

**Đã sửa 1 lỗi bảo mật thật** (xem Bug List). Các mục còn lại đạt yêu cầu.

## STEP 7 — Performance

Xem chi tiết: [`performance-report-phase6.md`](performance-report-phase6.md)

## STEP 8 — Code Quality

- `tsc --noEmit`: **0 lỗi** (backend và frontend).
- ESLint: **chưa cấu hình** ở cả backend lẫn frontend (script `lint` trong `package.json` tồn tại nhưng không có file cấu hình `eslint.config.js`/`.eslintrc`) — xem Known Limitations.
- Không phát hiện pattern N+1 query rõ ràng qua rà soát tĩnh services.
- Không có `dangerouslySetInnerHTML` trong frontend — loại trừ rủi ro XSS qua render Markdown/user content hiện tại.

## STEP 9 — Regression Test (sau khi sửa lỗi)

| Bộ test | Kết quả |
|---|---|
| Backend Jest | 8 suites / **36 tests PASS** |
| AI Service Pytest | **28 tests PASS** |
| OCR fix re-verify | File giả mạo mimetype → reject đúng; file JPEG thật → vẫn pass |

## Kết luận

Hệ thống chạy đúng đầu-cuối cho toàn bộ luồng chính. 1 lỗi bảo mật đã được phát hiện và vá (file upload validation). Không phát hiện lỗi kiến trúc/DB nghiêm trọng cần dừng để xin phương án. Sẵn sàng đề xuất CHỐT PHASE 6.
