# VAIC 2026 — Virtual AI Citizen Assistant

> Trợ lý AI hỗ trợ người dân thực hiện thủ tục dịch vụ công (dự thi AI 2026).
>
> **Trạng thái:** ✅ PHASE 1-5 hoàn thành — hệ thống chạy đầy đủ end-to-end (Frontend ↔ Backend ↔ AI Service ↔ PostgreSQL).

## Kiến trúc & Stack

| Tầng | Công nghệ | Thư mục | Port dev |
|------|-----------|---------|----------|
| Frontend | Next.js 15 + TypeScript + Tailwind | `frontend/` | 3001 |
| Backend | NestJS 11 + TypeORM | `backend/` | 3100 |
| AI Service | Python FastAPI + Claude API | `ai-service/` | 8000 |
| Database | PostgreSQL 16 + pgvector (Docker) | `database/` | 5433 |
| Gateway | Nginx (PHASE 8) | `deployment/nginx/` | 80 |

## Chạy môi trường dev (đầy đủ, đúng thứ tự)

```bash
# 1. Database
docker compose up -d postgres

# 2. AI Service (Docker — máy không cần Python)
cd ai-service
docker build -t vaic-ai-service .
docker run -d --rm --name vaic-ai --network civicai_default \
  -e DB_HOST=vaic-postgres -e DB_PORT=5432 -e DB_USER=vaic -e DB_PASSWORD=vaic_dev_password -e DB_NAME=vaic \
  -e LLM_PROVIDER=claude -e ANTHROPIC_API_KEY=<key-that> \
  -p 8000:8000 vaic-ai-service
curl -X POST http://localhost:8000/ai/ingest   # nạp kho tri thức (luật/thủ tục/cơ quan)

# 3. Backend
cd ../backend
npm install
cp .env.example .env
npm run migration:run       # 19 bảng + seed roles + seed demo data (34 tỉnh/thành, thủ tục, luật, cơ quan)
npm run start:dev           # http://localhost:3100/api/v1

# 4. Frontend
cd ../frontend
npm install
cp .env.example .env.local
npm run dev                 # http://localhost:3001
```

> **Không có `ANTHROPIC_API_KEY`?** Đặt `LLM_PROVIDER=mock` khi chạy AI Service — toàn bộ luồng vẫn hoạt động (RAG search dùng embedding thật), chỉ câu trả lời văn bản là giả lập.

## Tài liệu

- [`docs/ai-architecture.md`](docs/ai-architecture.md) — AI Engine: LLM Adapter, RAG, OCR, Voice, Prompt Strategy
- [`docs/system-integration.md`](docs/system-integration.md) — Sequence diagram Chat/OCR/Voice, API Mapping, Known Issues
- [`backend/README.md`](backend/README.md) — API list, migration, cấu hình Phase 4
- [`frontend/README.md`](frontend/README.md) — Component tree, State Management, Routing

## Quy ước

Mọi thay đổi schema đi qua migration (không synchronize); mọi API trả response chuẩn `{success, data|error, meta}`; secrets chỉ nằm trong `.env` (không commit).

## Lộ trình

PHASE 1 ✅ Khung dự án · PHASE 2 ✅ Backend Core (Auth/CRUD) · PHASE 3 ✅ AI Engine (RAG/OCR/Voice) · PHASE 4 ✅ System Integration (Chat↔AI thật, Cache, Rate Limit, Circuit Breaker) · PHASE 5 ✅ Frontend hoàn chỉnh (12 trang) → PHASE 6 Testing & Deployment
