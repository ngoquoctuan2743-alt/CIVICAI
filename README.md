# VAIC 2026 — Virtual AI Citizen Assistant

> Trợ lý AI hỗ trợ người dân thực hiện thủ tục dịch vụ công (dự thi AI 2026).
>
> **Trạng thái:** ✅ PHASE 1-9 hoàn thành — MVP đã Freeze, sẵn sàng nộp bài dự thi VAIC 2026.

## Kiến trúc & Stack

| Tầng | Công nghệ | Thư mục | Port |
|------|-----------|---------|----------|
| Frontend | Next.js 15 + TypeScript + Tailwind | `frontend/` | 3001 |
| Backend | NestJS 11 + TypeORM | `backend/` | 3100 |
| AI Service | Python FastAPI + Claude API | `ai-service/` | 8000 |
| Database | PostgreSQL 16 + pgvector (Docker) | `database/` | 5433 |
| Gateway | Nginx | `deployment/nginx/` | 80 |

## Chạy nhanh (1 lệnh, khuyến nghị)

```powershell
.\scripts\setup.ps1        # build + migration + seed + khởi động toàn bộ 5 service
.\scripts\healthcheck.ps1  # xác nhận tất cả PASS
```

Xem chi tiết tại [`docs/INSTALL.md`](docs/INSTALL.md) và [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

> **Không có `ANTHROPIC_API_KEY`?** Mặc định `LLM_PROVIDER=mock` — toàn bộ luồng vẫn hoạt động (RAG search dùng embedding thật), chỉ câu trả lời văn bản là giả lập.

## Tài liệu

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Sơ đồ kiến trúc hệ thống (container diagram)
- [`docs/DATABASE.md`](docs/DATABASE.md) — Sơ đồ quan hệ dữ liệu (ERD)
- [`docs/INSTALL.md`](docs/INSTALL.md) — Cài đặt
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Kiến trúc container, vòng đời vận hành
- [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) — Toàn bộ biến môi trường
- [`docs/API.md`](docs/API.md) — Danh sách API
- [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md) — Kịch bản demo
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — Lịch sử thay đổi theo Phase
- [`docs/known-limitations.md`](docs/known-limitations.md) — Giới hạn đã biết
- [`docs/ai-architecture.md`](docs/ai-architecture.md) — AI Engine: LLM Adapter, RAG, OCR, Voice, Prompt Strategy
- [`docs/system-integration.md`](docs/system-integration.md) — Sequence diagram Chat/OCR/Voice, API Mapping
- [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md) — Chi tiết từng service

## Quy ước

Mọi thay đổi schema đi qua migration (không synchronize); mọi API trả response chuẩn `{success, data|error, meta}`; secrets chỉ nằm trong `.env` (không commit, xem `.gitignore`).

## Lộ trình

PHASE 1 ✅ Khung dự án · PHASE 2 ✅ Backend Core · PHASE 3 ✅ AI Engine · PHASE 4 ✅ System Integration · PHASE 5 ✅ Frontend hoàn chỉnh · PHASE 6 ✅ System Stabilization · PHASE 7 ✅ Release Candidate · PHASE 8 ✅ MVP Feature Completion (Dashboard Admin, RAG hoàn thiện, Frontend đầy đủ) · PHASE 9 ✅ MVP Freeze & Final Review → Nộp bài dự thi
