# VAIC 2026 — Cài đặt (Install)

## Yêu cầu

- Docker Desktop (đã test với Docker 29.x, Docker Compose v2 — lệnh `docker compose`)
- Node.js 24.x + npm (chỉ cần cho bước chạy migration từ host — xem giải thích ở [DEPLOYMENT.md](DEPLOYMENT.md))
- (Tuỳ chọn) `ANTHROPIC_API_KEY` nếu muốn AI trả lời thật thay vì mock

## Cài đặt 1 lệnh (khuyến nghị)

```powershell
cd CIVICAI
.\scripts\setup.ps1
```

Script này tự động: build Docker image → khởi động PostgreSQL → chạy migration + seed → khởi động Backend/AI Service/Frontend/Nginx → nạp kho tri thức AI. Xem chi tiết từng bước tại [DEPLOYMENT.md](DEPLOYMENT.md).

Sau khi chạy xong, kiểm tra:

```powershell
.\scripts\healthcheck.ps1
```

Truy cập:
- Frontend: http://localhost:3001 (hoặc http://localhost qua Nginx)
- Backend API: http://localhost:3100/api/v1
- AI Service: http://localhost:8000

## Cài đặt thủ công (không dùng script)

```bash
# 1. Database
docker compose --env-file .env.development up -d postgres

# 2. Migration + seed (từ host)
cd backend
npm install
cp .env.development .env
npm run migration:run
cd ..

# 3. Build và khởi động toàn bộ service
docker compose --env-file .env.development up -d --build

# 4. Nạp kho tri thức AI
curl -X POST http://localhost:8000/ai/ingest
```

## Bật LLM thật (không bắt buộc cho demo)

Mặc định `LLM_PROVIDER=mock` — hệ thống chạy đầy đủ nhưng câu trả lời AI là giả lập (RAG search vẫn dùng embedding thật). Để bật Claude thật:

1. Sửa `.env.development`, điền `ANTHROPIC_API_KEY=<key thật>` và `LLM_PROVIDER=claude`.
2. `docker compose --env-file .env.development up -d --build ai-service`

## Gỡ cài đặt / làm sạch hoàn toàn

```powershell
.\scripts\reset.ps1
```

**Cảnh báo:** lệnh này xoá toàn bộ dữ liệu Postgres + file upload hiện có, yêu cầu gõ `YES` để xác nhận.
