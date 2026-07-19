# VAIC 2026 — Deployment (PHASE 7 Release Candidate)

## Kiến trúc container

```
┌─────────┐   ┌──────────┐   ┌────────────┐   ┌─────────────┐   ┌────────────┐
│  nginx  │──▶│ frontend │   │  backend   │──▶│ ai-service  │──▶│ postgres   │
│ (:80)   │──▶│ (:3001)  │   │  (:3100)   │   │  (:8000)    │   │ (pgvector) │
└─────────┘   └──────────┘   └────────────┘   └─────────────┘   └────────────┘
     │              │              │                 │                 │
     └── / ─────────┘              │                 │                 │
     └── /api/ ───────────────────▶┘                 │                 │
     └── /ai/ ───────────────────────────────────────▶┘                 │
                                    └── DB_HOST=postgres ───────────────▶┘
                                                       └── DB_HOST=postgres
```

5 service trong `docker-compose.yml`: `postgres`, `backend`, `ai-service`, `frontend`, `nginx`. Chạy `docker compose up -d --build` khởi động toàn bộ.

## Vòng đời vận hành

| Script | Khi nào dùng | Có mất dữ liệu? |
|---|---|---|
| `scripts/setup.ps1` | Lần đầu cài đặt, hoặc sau khi đổi Dockerfile/dependency | Không |
| `scripts/start.ps1` | Khởi động lại sau khi tắt máy/dừng container | Không |
| `scripts/stop.ps1` | Tạm dừng hệ thống, giữ nguyên dữ liệu | Không |
| `scripts/healthcheck.ps1` | Kiểm tra nhanh trạng thái trước khi demo | Không (chỉ đọc) |
| `scripts/reset.ps1` | Làm sạch hoàn toàn, setup lại từ đầu | **Có — xoá volume Postgres + upload** |

## Vì sao migration chạy từ host, không chạy trong container backend?

Image production của backend (`backend/Dockerfile`) chỉ chứa `dist/` đã build (đúng thực hành tối ưu kích thước image), không chứa `src/` hay `ts-node`. TypeORM CLI (`npm run migration:run`) cần `src/database/data-source.ts`, nên bước migration được chạy từ máy host (Node đã cài sẵn) nhắm vào cổng Postgres đã expose (`localhost:5433`), giống hệt quy trình đã dùng từ PHASE 1. Đây là lựa chọn có chủ đích để giữ image runtime gọn nhẹ, không phải thiếu sót.

## Build & Up thủ công

```bash
docker compose --env-file .env.development build
docker compose --env-file .env.development up -d
docker compose ps
docker compose logs -f backend   # xem log 1 service
```

## Reverse Proxy (Nginx)

`deployment/nginx/nginx.conf`: `/` → frontend:3001, `/api/` → backend:3100, `/ai/` → ai-service:8000. Dùng khi demo muốn 1 cổng duy nhất (port 80) thay vì nhớ 3 port riêng.

## Production thật (ngoài phạm vi demo)

`.env.production` (root/backend/ai-service) chỉ chứa **placeholder** — phải điền `JWT_SECRET`, `DB_PASSWORD`, `ANTHROPIC_API_KEY`, domain thật trước khi dùng. Xem [CONFIGURATION.md](CONFIGURATION.md) và [KNOWN_LIMITATIONS](known-limitations.md) mục Rate Limit/Cache in-memory (cần Redis khi chạy nhiều instance).

## Deploy công khai: Hostinger (frontend) + Railway (backend/AI-service/DB)

Hostinger **Business Web Hosting** chỉ chạy được 1 app Node.js duy nhất (không hỗ trợ Docker/docker-compose nhiều container), nên tách làm 2 nơi:

### 1. Backend + AI-service + Postgres → Railway

Railway hỗ trợ deploy thẳng từ Dockerfile sẵn có (`backend/Dockerfile`, `ai-service/Dockerfile`) và Postgres image tuỳ chỉnh (cần `pgvector/pgvector:pg16`, không dùng Postgres mặc định của Railway vì thiếu extension `vector`).

1. Tạo project mới trên Railway, connect GitHub repo `CIVICAI`.
2. Thêm 3 service, mỗi service trỏ **Root Directory** riêng:
   - `postgres` — dùng **Docker Image** `pgvector/pgvector:pg16` (không phải template Postgres mặc định của Railway), set biến `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` giống `docker-compose.yml`.
   - `backend` — Root Directory `backend/`, Railway tự nhận `Dockerfile`. Biến môi trường copy từ mục `backend.environment` trong `docker-compose.yml`, đổi `DB_HOST`/`AI_SERVICE_BASE_URL` sang domain nội bộ Railway (Railway cấp domain private giữa các service cùng project, dạng `<service>.railway.internal`) và `CORS_ORIGINS` trỏ đúng domain Hostinger sẽ dùng.
   - `ai-service` — Root Directory `ai-service/`, tương tự copy biến từ `docker-compose.yml`.
3. Bật **Public Networking** cho service `backend` (để frontend trên Hostinger gọi API qua Internet) — Railway cấp domain dạng `xxx.up.railway.app`, có thể gắn domain riêng.
4. Chạy migration 1 lần: từ máy local, trỏ `DB_HOST`/`DB_PORT` sang domain public Railway (bật tạm Public Networking cho `postgres` để chạy `npm run migration:run`, sau đó tắt lại nếu muốn giới hạn truy cập).

### 2. Frontend → Hostinger Node.js App

Frontend dùng custom server (`frontend/server.js`) thay vì `next start`, vì Hostinger (Passenger) cần 1 file JS khởi động trực tiếp, không chạy qua npm script.

1. hPanel → Websites → chọn site → **Node.js**.
2. Application root: `frontend` (thư mục con trong repo, nếu Hostinger connect Git tới root repo).
3. Application startup file: `server.js`.
4. Node.js version: 20+ (khớp `engines` nếu có, dự án dùng Node 24 khi dev — Hostinger thường hỗ trợ tối đa bản LTS mới nhất, kiểm tra danh sách version khả dụng trong hPanel).
5. Biến môi trường bắt buộc **trước khi build** (Next.js inline biến `NEXT_PUBLIC_*` lúc build, không đổi được sau khi build xong):
   - `NEXT_PUBLIC_API_BASE_URL=https://<domain-backend-tren-railway>/api/v1`
6. Build command: `npm install && npm run build`. Start command/Application startup file: `server.js` (Hostinger tự chạy `node server.js`, đọc `PORT` qua Passenger).

### Lưu ý

- `NEXT_PUBLIC_API_BASE_URL` sai hoặc thiếu lúc build → toàn bộ gọi API từ frontend sẽ trỏ về `localhost:3100` (giá trị mặc định trong `frontend/src/lib/constants.ts`), không hoạt động khi truy cập từ ngoài.
- `CORS_ORIGINS` ở backend (Railway) phải khớp đúng domain Hostinger, nếu không trình duyệt sẽ chặn request (`net::ERR_FAILED`), lỗi tương tự đã ghi nhận ở PHASE 4.
- Đây là bổ sung tài liệu, **không thay đổi kiến trúc/luồng dữ liệu hiện có** — `docker-compose.yml` vẫn dùng nguyên cho local/demo.
