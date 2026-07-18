# CHANGELOG — VAIC 2026

## PHASE 8 — MVP Feature Completion & Release Candidate v2 (2026-07-18)

- **Database & Data Layer**: bảng mới `audit_logs`, `voice_logs`; cột mới `category`/`expected_result` (procedures), `content`/`version`/`metadata` (legal_documents), `working_hours` (agencies), `avatar_url` + `reset_token_*` (users). Mở rộng seed: 20 agencies, 20 legal documents, 30 procedures (từ 5/6/8), 1 admin + 5 citizen kèm citizen_profiles, conversation + feedback mẫu.
- **Backend API**: Change/Forgot/Reset Password, Upload Avatar, List/Get/Khóa User (Admin), Rename/Delete/Search Conversation, filter Procedures theo lĩnh vực/địa phương/cấp, filter Agencies theo địa phương, endpoint `GET /government/provinces`, Quản lý Feedback + Audit Logs (Admin), Voice placeholder (`/voice/stt`, `/voice/tts`), `AuditLogService` ghi log tại các hành động nhạy cảm (login/register/admin CRUD).
- **Dashboard Admin**: hoàn thiện đầy đủ (Dashboard Summary, CRUD Procedures/Legal/Agencies/Users, Feedback, Audit Logs) — thành phần kiến trúc đã chốt nhưng chưa từng có UI trước Phase 8.
- **AI Service & RAG**: ingestion đọc đủ field mới (category/expected_result/content/version/working_hours); System Prompt bổ sung nguyên tắc hỏi lại khi câu hỏi mơ hồ + cấu trúc câu trả lời thủ tục theo thứ tự hồ sơ→bước→cơ quan→thời hạn→lệ phí→căn cứ pháp lý. Re-index kb_chunks đủ 70 nguồn/96 chunks.
- **Frontend**: đổi tên/xóa/tìm hội thoại, lọc thủ tục/cơ quan theo lĩnh vực-địa phương-cấp, Change Password + Avatar upload UI, Forgot/Reset Password nối API thật, trang chủ có ô hỏi nhanh + thủ tục phổ biến (tự động gửi câu hỏi sau đăng ký), kéo-thả file OCR.
- Sửa bug responsive: `MobileNav` mất tab cuối ở viewport 375px do thiếu `min-w-0` trên flex item.
- Chuẩn hóa `.env.example` (root + backend) khớp đầy đủ biến `docker-compose.yml` thực dùng; cải thiện `scripts/setup.ps1` chờ AI Service sẵn sàng (poll tối đa 60s) trước khi ingest thay vì sleep cố định 3s.
- Verify: **63/63 Jest backend**, **14/14 pytest AI Service**, Frontend build sạch (17 route), migration `No migrations are pending` khi chạy lại `setup.ps1` (xác nhận idempotent), toàn bộ 7 kịch bản demo bắt buộc verify qua RAG retrieval thật, OCR + Voice flow end-to-end qua API thật, file upload validation (magic bytes) chặn đúng file giả mạo.

## PHASE 7 — Release Candidate (2026-07-18)

- Viết `backend/Dockerfile`, `frontend/Dockerfile` thay placeholder (multi-stage build).
- Hoàn thiện `docker-compose.yml`: bật đủ 5 service (`postgres`, `backend`, `ai-service`, `frontend`, `nginx`). `docker compose up -d --build` khởi động toàn bộ hệ thống.
- Sửa `deployment/nginx/nginx.conf`: upstream `frontend` trỏ đúng port 3001 (trước đó ghi nhầm 3000).
- Thêm `.env.development` / `.env.production` (root, backend, ai-service) — chỉ chứa placeholder an toàn.
- Thêm script `scripts/setup.ps1`, `start.ps1`, `stop.ps1`, `reset.ps1`, `healthcheck.ps1` — đã verify chạy thật (trừ `reset.ps1` vì mang tính phá huỷ, chỉ review code).
- Bổ sung readiness check thật cho `GET /health` (kiểm tra kết nối Database + AI Service), không đổi endpoint/response cũ — chỉ mở rộng thêm field `ready` + `checks`.
- Thêm tài liệu: `INSTALL.md`, `DEPLOYMENT.md`, `CONFIGURATION.md`, `API.md`, `DEMO_GUIDE.md`.
- Verify: migration + seed chạy đúng trong môi trường Docker mới; toàn bộ 5 container healthy; login/chat/procedures hoạt động qua Nginx gateway; 37/37 Jest backend PASS.

## PHASE 6 — System Stabilization (2026-07-18)

- Tạo baseline commit + tag `v0.5-baseline` cho toàn bộ Phase 1-5.
- Sửa lỗi bảo mật: `documents.service.ts` chỉ tin `mimetype` client khai báo khi upload OCR — thêm kiểm tra magic bytes thật (JPEG/PNG/WEBP).
- QA toàn diện: System Audit, Functional Test (full stack chạy thật), API Validation, Database Validation (migration up/down/up trên DB cô lập), AI Validation (28/28 pytest PASS), Security Review, Performance, Code Quality, Logging.
- Tài liệu: `qa-report-phase6.md`, `bug-list-phase6.md`, `security-checklist-phase6.md`, `performance-report-phase6.md`, `known-limitations.md`.

## PHASE 1-5 (trước phiên QA)

- PHASE 1: Khung dự án (NestJS + Next.js + FastAPI + PostgreSQL/pgvector).
- PHASE 2: Backend Core (Auth JWT, CRUD, RBAC).
- PHASE 3: AI Engine (RAG, OCR, Voice, Prompt Engineering, LLM Adapter Claude/mock).
- PHASE 4: System Integration (Chat↔AI thật, Cache, Rate Limit, Circuit Breaker).
- PHASE 5: Frontend hoàn chỉnh (12 trang: chat, procedures, legal, agencies, auth, profile...).
