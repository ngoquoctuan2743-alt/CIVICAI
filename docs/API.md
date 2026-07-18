# VAIC 2026 — API Reference

Base URL: `http://localhost:3100/api/v1` (qua Nginx: `http://localhost/api/v1`)
Format phản hồi chuẩn cho mọi endpoint: `{ success, data | error, meta: { requestId, timestamp, path } }`
Auth: `Authorization: Bearer <accessToken>` (trừ endpoint đánh dấu **Public**)

## Auth (`/auth`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký tài khoản công dân (role CITIZEN), trả về access + refresh token |
| POST | `/auth/login` | Public | Đăng nhập, trả access token (15p) + refresh token (7 ngày) |
| POST | `/auth/refresh` | Public | Cấp lại cặp token (refresh token rotation) |
| POST | `/auth/logout` | Bearer | Thu hồi refresh token hiện tại |

## Users (`/users`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/users/profile` | Bearer | Thông tin tài khoản đang đăng nhập |
| PUT | `/users/profile` | Bearer | Cập nhật hồ sơ (họ tên, số điện thoại) |
| DELETE | `/users/account` | Bearer | Xoá tài khoản (soft delete) |

## Citizens (`/citizens`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/citizens/profile` | Bearer | Hồ sơ công dân mở rộng |
| POST | `/citizens/profile` | Bearer | Tạo hồ sơ công dân |
| PUT | `/citizens/profile` | Bearer | Cập nhật hồ sơ công dân |

## Conversations (`/conversations`) — Chat/RAG/Voice/Feedback

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/conversations` | Bearer | Tạo phiên hội thoại mới (`channel`: `CHAT` \| `VOICE`) |
| GET | `/conversations` | Bearer | Lịch sử hội thoại của tôi (phân trang) |
| GET | `/conversations/:id/messages` | Bearer | Danh sách tin nhắn trong hội thoại (phân trang) |
| POST | `/conversations/:id/messages` | Bearer | Gửi tin nhắn — AI trả lời qua Intent + RAG, lưu cả 2 lượt |
| POST | `/conversations/:id/messages/:messageId/feedback` | Bearer | Đánh giá câu trả lời AI (`rating`: `1` \| `-1`) |

## Documents (`/documents`) — OCR

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/documents/analyze` | Bearer | Upload ảnh giấy tờ (multipart, field `file`) → OCR + phân tích AI. Chấp nhận `image/jpeg`, `image/png`, `image/webp` (xác minh bằng magic bytes thật, tối đa `MAX_FILE_SIZE_BYTES`) |
| GET | `/documents/mine` | Bearer | Lịch sử OCR của tôi (tối đa 50 gần nhất) |

## Tra cứu (Public — không cần đăng nhập)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/procedures` | Danh sách thủ tục hành chính (query `search`) |
| GET | `/procedures/:id` | Chi tiết 1 thủ tục (bao gồm bước thực hiện, hồ sơ cần) |
| GET | `/legal/documents` | Danh sách văn bản pháp luật (query `search`) |
| GET | `/legal/documents/:id` | Chi tiết 1 văn bản luật |
| GET | `/government/agencies` | Danh sách cơ quan nhà nước (query `search`) |
| GET | `/government/agencies/:id` | Chi tiết 1 cơ quan |

## System

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/health` | Public | Liveness + readiness (PHASE 7): `{status, ready, checks:{database, aiService}}` |
| GET | `/version` | Public | Tên app, version, environment |

## AI Service (port 8000, không qua Backend — dùng nội bộ hoặc test trực tiếp)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Trạng thái AI Service + LLM provider đang dùng |
| POST | `/ai/chat` | Chat với Intent Detection + RAG |
| POST | `/ai/voice` | Chat bằng giọng nói (nhận transcript) |
| POST | `/ai/document` | OCR + phân tích ảnh (base64) |
| POST | `/ai/search` | Tìm kiếm ngữ nghĩa trực tiếp trên kho tri thức (không qua LLM) |
| GET | `/ai/history` | Proxy lịch sử hội thoại sang Backend |
| POST | `/ai/ingest` | Nạp/refresh embedding từ database (chạy sau khi seed data thay đổi) |

## Mã lỗi chuẩn (`error.code`)

`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BAD_REQUEST`, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE` (circuit breaker AI), `INTERNAL_ERROR`.
