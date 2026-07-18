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
