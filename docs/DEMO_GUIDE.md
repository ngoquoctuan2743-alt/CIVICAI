# VAIC 2026 — Demo Guide

Chuẩn bị: chạy `.\scripts\setup.ps1` (hoặc `start.ps1` nếu đã setup trước đó), sau đó `.\scripts\healthcheck.ps1` phải PASS toàn bộ trước khi demo.

Truy cập: **http://localhost:3001** (hoặc `http://localhost` qua Nginx).

## Kịch bản demo công dân (golden path — đã verify hoạt động thật qua Prompt 16-22)

1. **Trang chủ**: gõ câu hỏi ngay ở ô "Hỏi ngay" (vd *"Tôi muốn đổi CCCD cần giấy tờ gì?"*) → chuyển sang **Đăng ký** → sau khi đăng ký xong, câu hỏi được **tự động gửi** vào hội thoại mới.
2. **Chat**: AI trả lời kèm hướng dẫn thủ tục.
   - Nếu `LLM_PROVIDER=claude` (đã có API key thật): câu trả lời trích dẫn nguồn `[1][2]` từ RAG, có thể hỏi lại nếu câu hỏi mơ hồ (vd nhiều loại "đổi CCCD" khác nhau).
   - Nếu `LLM_PROVIDER=mock` (mặc định demo không cần key): câu trả lời dạng `[MOCK] Đã nhận câu hỏi...` — vẫn thể hiện đúng luồng kỹ thuật (Intent + RAG retrieval thật + lưu lịch sử), chỉ khác nội dung câu trả lời cuối.
3. **Tra cứu thủ tục/luật/cơ quan**: vào `/procedures` (30 thủ tục, lọc theo **lĩnh vực**/**địa phương**/**cấp thực hiện**), `/legal` (20 văn bản), `/agencies` (20 cơ quan, lọc theo địa phương, có giờ làm việc).
4. **Upload ảnh giấy tờ** (trang Chat, nút đính kèm hoặc **kéo-thả**) → OCR đọc thông tin → AI gợi ý bước tiếp theo.
5. **Voice Chat**: bấm mic, nói câu hỏi → AI trả lời → bấm loa để nghe đọc lại (Web Speech API của trình duyệt, cần Chrome/Edge).
6. **Feedback**: bấm 👍/👎 dưới câu trả lời AI.
7. **Lịch sử hội thoại**: tìm kiếm theo tiêu đề, đổi tên, xóa hội thoại ngay trong danh sách.
8. **Hồ sơ cá nhân**: đổi mật khẩu, đổi ảnh đại diện.

## Kịch bản demo Admin

Đăng nhập bằng tài khoản có role ADMIN (xem "Tài khoản demo" bên dưới) → menu **Quản trị**:

1. **Dashboard** — số liệu tổng quan (users, hội thoại, thủ tục, cơ quan, văn bản, feedback).
2. **Quản lý Thủ tục / Văn bản pháp luật / Cơ quan nhà nước** — tạo/sửa/ẩn (xóa mềm) ngay trên giao diện, không cần thao tác DB tay.
3. **Quản lý tài khoản** — khóa/mở tài khoản người dùng.
4. **Feedback & Audit Logs** — xem thống kê đánh giá của người dùng và nhật ký hoạt động hệ thống (ai làm gì, khi nào).

## Dữ liệu mẫu có sẵn (không cần tạo tay)

- 34 tỉnh/thành (administrative_units)
- **30 thủ tục hành chính** — Căn cước, Hộ tịch, Cư trú, Xuất nhập cảnh, Thuế, Bảo hiểm xã hội/y tế, Y tế, Giáo dục, Giao thông, Đất đai, Doanh nghiệp, Lao động
- **20 văn bản pháp luật** — Luật Căn cước, Luật Đất đai, Luật BHXH, Bộ luật Lao động, Luật Doanh nghiệp, Luật Trật tự ATGT đường bộ...
- **20 cơ quan nhà nước** — Hà Nội, TP.HCM, Đà Nẵng (công an, tư pháp, thuế, BHXH, y tế, giáo dục, giao thông, kế hoạch đầu tư...)
- **1 admin + 5 citizen** kèm hồ sơ công dân, 1 hội thoại mẫu, 1 feedback mẫu

### Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin1@vaic.gov.vn` | `Demo@2026` |
| Citizen | `citizen1@example.com` ... `citizen5@example.com` | `Demo@2026` |

## Nếu AI Provider không khả dụng khi demo (Offline Mode)

Hệ thống vẫn chạy đầy đủ với `LLM_PROVIDER=mock` — không cần internet/API key. RAG search (tìm thủ tục/luật liên quan) dùng embedding thật đã nạp sẵn (96 chunks từ 70 nguồn), chỉ câu trả lời văn bản cuối là mẫu cố định. Đây là phương án dự phòng mặc định, không cần thao tác gì thêm.

Nếu vừa `setup.ps1`/khởi động lại `ai-service`, kho tri thức cần nạp lại (script đã tự làm, nhưng nếu cần thủ công):

```powershell
curl -X POST http://localhost:8000/ai/ingest
```

## Sự cố thường gặp lúc demo

| Hiện tượng | Cách xử lý nhanh |
|---|---|
| Trang trắng / không load | `.\scripts\healthcheck.ps1` để xem service nào FAIL, sau đó `docker compose logs <service>` |
| Chat không trả lời (treo) | Circuit breaker có thể đang mở do AI Service lỗi liên tiếp — đợi 30s hoặc `docker compose restart ai-service` |
| RAG không tìm thấy thủ tục mới thêm qua Admin | Chạy lại `curl -X POST http://localhost:8000/ai/ingest` — Admin CRUD chưa tự động re-index |
| Voice không hoạt động | Cần trình duyệt hỗ trợ Web Speech API (Chrome/Edge), không phải lỗi hệ thống |
| Ảnh đại diện không hiển thị | Đã biết — avatar upload thành công nhưng chưa bật static file serving (xem `known-limitations.md`) |
| Mất dữ liệu sau khi demo xong | Chỉ xảy ra nếu chạy `reset.ps1` — dùng `stop.ps1`/`start.ps1` để giữ dữ liệu giữa các lần demo |
