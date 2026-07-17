# VAIC 2026 Backend

API server của VAIC 2026 — **NestJS + TypeScript + TypeORM + PostgreSQL**, Clean Architecture.

> **Trạng thái:** ✅ PHASE 4 (System Integration) hoàn thành — AI tích hợp thật, OCR, Feedback, Cache, Rate Limit, Circuit Breaker.

## Chạy Backend

```bash
# Yêu cầu: Docker Desktop đang chạy (PostgreSQL)
docker compose up -d postgres        # chạy ở thư mục gốc dự án

cd backend
npm install
cp .env.example .env                 # Windows: copy .env.example .env
npm run migration:run                # tạo 19 bảng + seed roles
npm run start:dev                    # http://localhost:3100/api/v1
```

- **Swagger/OpenAPI:** http://localhost:3100/api/docs
- **Docker Mode:** `docker build -t vaic-backend .` (Dockerfile hoàn thiện ở PHASE 8)

## Environment (backend/.env)

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `PORT` | 3100 | Port 3000 thường bị chiếm trên máy dev |
| `JWT_SECRET` | dev default | **BẮT BUỘC đổi ở production** |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_DAYS` | 15m / 7 | TTL token |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | localhost/5433/vaic/.../vaic | PostgreSQL Docker |

## Database Migration

```bash
npm run migration:generate src/database/migrations/TenMigration   # sinh từ entity
npm run migration:run                                             # áp dụng
npm run migration:revert                                          # rollback 1 bước
```

Thêm entity mới → bổ sung vào `src/database/entities/index.ts` (ALL_ENTITIES).

## API List (prefix `api/v1`; 🔓 public, 🔒 Bearer JWT)

| Method | Endpoint | Mô tả |
|---|---|---|
| 🔓 POST | `/auth/register` | Đăng ký (gán role CITIZEN) |
| 🔓 POST | `/auth/login` | Đăng nhập → access + refresh token |
| 🔓 POST | `/auth/refresh` | Cấp lại token (rotation) |
| 🔒 POST | `/auth/logout` | Thu hồi refresh token |
| 🔒 GET/PUT | `/users/profile` | Xem / sửa tài khoản |
| 🔒 DELETE | `/users/account` | Xóa tài khoản (soft delete) |
| 🔒 GET/POST/PUT | `/citizens/profile` | Hồ sơ công dân (province + ward 2 cấp) |
| 🔓 GET | `/government/agencies`, `/government/agencies/:id` | Tra cứu cơ quan |
| 🔓 GET | `/legal/documents`, `/legal/documents/:id` | Tra cứu văn bản pháp luật |
| 🔓 GET | `/procedures`, `/procedures/:id` | Thủ tục (kèm steps + requirements) |
| 🔒 POST/GET | `/conversations` | Tạo / lịch sử hội thoại (channel CHAT hoặc VOICE) |
| 🔒 GET/POST | `/conversations/:id/messages` | Xem / gửi tin nhắn — **gọi AI thật** (RAG/Intent), lưu câu trả lời |
| 🔒 POST | `/conversations/:id/messages/:messageId/feedback` | Đánh giá 👍(1)/👎(-1) câu trả lời AI |
| 🔒 POST | `/documents/analyze` | Upload ảnh giấy tờ (multipart) → OCR + phân tích AI → JSON |
| 🔒 GET | `/documents/mine` | Lịch sử OCR của tôi |
| 🔓 GET | `/health`, `/version` | System |

### PHASE 4 — System Integration

- **AI Client** (`modules/ai-client/`): HTTP client tới AI Service, timeout riêng theo loại tác vụ, retry 1 lần cho lỗi mạng, **Circuit Breaker** (5 lỗi liên tiếp → mở mạch 30s), lỗi map về `AppException` chuẩn.
- **Cache**: in-memory TTL 5 phút cho `government/legal/procedures` (dữ liệu công khai, KHÔNG cache dữ liệu cá nhân).
- **Rate Limit**: 100 req/phút/IP+route mặc định; `/auth/login`, `/auth/register` giới hạn 10 req/phút (chống brute-force).
- **Voice routing**: `conversation.channel = VOICE` → backend tự gọi `/ai/voice` thay vì `/ai/chat`, lưu `speakable=true` vào `messages.metadata`.
- Biến môi trường mới: `AI_SERVICE_BASE_URL`, `AI_*_TIMEOUT_MS`, `AI_CIRCUIT_BREAKER_*`, `UPLOAD_DIR`, `MAX_FILE_SIZE_BYTES` — xem `.env.example`.

Mọi response theo chuẩn `{ success, data | error, meta: { requestId, timestamp, path } }`.

## Test

```bash
npx jest --runInBand    # unit + API e2e (e2e cần PostgreSQL đang chạy)
```

## Quy ước quan trọng

- **Secure by default:** mọi route yêu cầu JWT trừ khi gắn `@Public()`.
- **Lỗi chuẩn:** chỉ ném `AppException` với `ErrorCode`.
- **Cấu hình:** chỉ đọc qua `ConfigService`.
- **Schema:** mọi thay đổi qua migration, không `synchronize`.
- **Layer:** Controller → Service → Repository; không nhảy tầng.
