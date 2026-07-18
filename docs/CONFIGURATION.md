# VAIC 2026 — Configuration Reference

## Root (`docker-compose.yml`, dùng bởi `.env.development` / `.env.production`)

| Biến | Mặc định dev | Mô tả |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `production` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `vaic` / `vaic_dev_password` / `vaic` | Postgres |
| `JWT_SECRET` | `vaic-dev-secret-change-me` | **Bắt buộc đổi ở production** (env.validation.ts chặn khởi động nếu thiếu khi `NODE_ENV=production`) |
| `LOG_LEVEL` | `debug` | `error`\|`warn`\|`log`\|`debug`\|`verbose` |
| `CORS_ORIGINS` | `http://localhost:3001` | Danh sách origin cách nhau bởi dấu phẩy |
| `LLM_PROVIDER` | `mock` | `mock` \| `claude` |
| `ANTHROPIC_API_KEY` | (trống) | Bắt buộc nếu `LLM_PROVIDER=claude` |
| `CLAUDE_MODEL` | `claude-opus-4-8` | Model Claude dùng cho chat/OCR |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3100/api/v1` | **Build-time** — đổi thì phải build lại image frontend |

## Backend (`backend/.env.development` / `.env.production`)

| Biến | Mô tả |
|---|---|
| `PORT` | Cổng HTTP (mặc định 3100) |
| `API_PREFIX` | Tiền tố route (`api/v1`) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_DAYS` | Thời hạn token (mặc định 15m / 7 ngày) |
| `DB_HOST` / `DB_PORT` | `localhost:5433` khi chạy host, `postgres:5432` khi trong docker network |
| `DB_LOGGING` | Bật log SQL TypeORM (debug) |
| `AI_SERVICE_BASE_URL` | `http://localhost:8000` (host) hoặc `http://ai-service:8000` (docker network) |
| `AI_*_TIMEOUT_MS` | Timeout riêng cho chat/document/search |
| `AI_CIRCUIT_BREAKER_THRESHOLD` / `_RESET_MS` | Ngưỡng mở circuit breaker khi AI Service lỗi liên tiếp |
| `UPLOAD_DIR` / `MAX_FILE_SIZE_BYTES` | Thư mục lưu file OCR (local disk demo), giới hạn dung lượng |

## AI Service (`ai-service/.env.development` / `.env.production`)

| Biến | Mô tả |
|---|---|
| `LLM_PROVIDER` | `mock` \| `claude` |
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-small` (tải sẵn vào Docker image lúc build) |
| `VOICE_ENGINE` | `browser` (Web Speech API phía client, AI Service không xử lý audio) |
| `BACKEND_BASE_URL` | Dùng cho endpoint `/ai/history` (proxy sang Backend) |

## Frontend (`frontend/.env.example` → `.env.local` khi chạy ngoài Docker)

| Biến | Mô tả |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL Backend mà trình duyệt gọi tới — build-time, inline vào bundle |

## Ma trận cấu hình theo môi trường chạy

| Ngữ cảnh | `DB_HOST` | `AI_SERVICE_BASE_URL` | `NEXT_PUBLIC_API_BASE_URL` |
|---|---|---|---|
| Chạy tay từng service ngoài Docker (`npm run dev`) | `localhost:5433` | `http://localhost:8000` | `http://localhost:3100/api/v1` |
| `docker compose up` (trong network) | `postgres:5432` | `http://ai-service:8000` | `http://localhost:3100/api/v1` (browser vẫn ở ngoài network, không đổi) |

Lưu ý: `NEXT_PUBLIC_API_BASE_URL` **không đổi** giữa 2 ngữ cảnh vì trình duyệt luôn chạy ngoài mạng Docker — nó cần địa chỉ mà máy host truy cập được (`localhost:3100`), không phải tên service nội bộ.
