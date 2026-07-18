# CHANGELOG — VAIC 2026

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
