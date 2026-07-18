# Known Limitations — sau PHASE 8 (Release Candidate v2)

Tổng hợp các giới hạn đã biết và được chấp nhận cho giai đoạn demo (không phải bug, không cần sửa trừ khi hướng tới production thật). Đã rà soát lại toàn bộ danh sách Phase 6 — các mục đã giải quyết được đánh dấu và loại khỏi danh sách hiện hành.

## Còn hiệu lực

1. **Mock LLM**: Chưa cấu hình `ANTHROPIC_API_KEY` → Chat/Voice/OCR trả lời/dữ liệu ở chế độ mock. RAG search (embedding thật, không qua LLM) hoạt động đúng độc lập — đã verify retrieval thật cho toàn bộ kịch bản demo bắt buộc.
2. **In-memory Rate Limit / Cache / Circuit Breaker**: đơn instance, không chia sẻ giữa nhiều container — cần Redis nếu scale production.
3. **JWT ở localStorage** (frontend): chấp nhận được cho demo, không phù hợp production thật (rủi ro XSS lý thuyết).
4. **File upload lưu local disk**: mất khi container restart — đúng thiết kế Storage demo đã chốt.
5. **ESLint chưa cấu hình** ở backend và frontend (script `lint` tồn tại nhưng thiếu config) — không chặn demo.
6. **Chưa test Prompt Injection với LLM thật** — đã review tĩnh (System Prompt có nguyên tắc chống injection ở tầng role-separation của LLM API, không nối chuỗi input người dùng vào system prompt) và có unit test cho luồng RAG, nhưng chưa chạy được với Claude thật do thiếu API key.
7. **Forgot Password chưa gửi email thật**: endpoint đã hoạt động thật (tạo/validate token, đổi mật khẩu) — chỉ thiếu tích hợp dịch vụ gửi email. Ở non-production, API trả kèm `devToken` để tự kiểm thử; production không bao giờ lộ token qua API.
8. **Avatar upload chưa hiển thị được**: file lưu thành công vào storage local nhưng chưa bật static file serving — cần bổ sung nếu demo cần hiển thị ảnh đại diện thật.
9. **Chat streaming chưa triển khai**: kiến trúc hiện tại là request/response thường; cần đổi phối hợp cả AI Service, Backend proxy và Frontend nếu muốn thêm.
10. **RAG không tự động re-index khi Admin CRUD dữ liệu**: tạo/sửa/xóa thủ tục, văn bản, cơ quan qua Dashboard Admin không tự cập nhật `kb_chunks` — cần gọi lại `POST /ai/ingest` thủ công (đã ghi trong DEMO_GUIDE.md).

## Đã giải quyết (trước đây liệt kê ở Phase 6, nay không còn hiệu lực)

- ~~`docker-compose.yml` chỉ có service `postgres`~~ — đã đóng gói đủ 5 service từ Phase 7, verify lại nhiều lần trong Prompt 16-22.
- ~~Health check chỉ là liveness~~ — đã có readiness check thật (kiểm tra Database + AI Service) từ Phase 7.
- ~~Next.js chạy dev mode~~ — container frontend build production (`next build` + `next start`) từ Phase 7, xác nhận qua `environment:"production"` ở mọi lần verify.
