# Performance Report — PHASE 6

Đo bằng `curl -w "%{time_total}"` trên máy dev (localhost, không có network latency thật), môi trường Docker Desktop + Node dev server + Uvicorn dev server. Số liệu mang tính tương đối, dùng để phát hiện bất thường, không phải benchmark production.

| Thao tác | Thời gian | Đánh giá |
|---|---|---|
| Backend `/health` | ~4ms | Tốt |
| Backend `/procedures` (list + join agency) | ~37ms | Tốt |
| AI Service `/ai/search` (embedding + pgvector search) | ~86ms | Tốt |
| AI Service `/ai/chat` (mock LLM) | ~5ms | Không đại diện cho LLM thật — Claude API thật sẽ mất 1-5s tùy độ dài |
| Backend `/documents/analyze` (OCR, mock) | ~223ms | Chấp nhận được; sẽ tăng đáng kể khi dùng Claude Vision thật |
| Frontend trang chủ (Next.js dev server) | ~0.6-1.1s | Bình thường cho **dev mode** (`next dev`, không cache/minify). Cần đo lại bằng `next build && next start` để có số liệu production thật — nằm ngoài phạm vi Phase 6 (không chạy production build). |

## Truy vấn dư thừa (N+1)

Rà soát tĩnh các service backend: không phát hiện pattern vòng lặp gọi repository bên trong `for`/`forEach`. Không cần tối ưu thêm ở Phase 6.

## Khuyến nghị cho Phase 7/8

- Đo lại toàn bộ bảng trên với `ANTHROPIC_API_KEY` thật để có số liệu AI response chính xác.
- Đo Frontend bằng production build (`next build`) trước khi demo chính thức.
