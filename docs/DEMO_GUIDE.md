# VAIC 2026 — Demo Guide

Chuẩn bị: chạy `.\scripts\setup.ps1` (hoặc `start.ps1` nếu đã setup trước đó), sau đó `.\scripts\healthcheck.ps1` phải PASS toàn bộ trước khi demo.

Truy cập: **http://localhost:3001** (hoặc `http://localhost` qua Nginx).

## Kịch bản demo (golden path — đã verify hoạt động thật ở PHASE 6/7)

1. **Đăng ký/Đăng nhập** — tạo tài khoản công dân mới hoặc dùng tài khoản demo có sẵn.
2. **Chat**: gõ *"Tôi muốn làm Căn cước công dân"*
   - AI trả lời kèm hướng dẫn thủ tục.
   - Nếu `LLM_PROVIDER=claude` (đã có API key thật): câu trả lời trích dẫn nguồn `[1][2]` từ RAG.
   - Nếu `LLM_PROVIDER=mock` (mặc định demo không cần key): câu trả lời dạng `[MOCK] Đã nhận câu hỏi...` — vẫn thể hiện đúng luồng kỹ thuật (Intent + lưu lịch sử), chỉ khác nội dung câu trả lời cuối.
3. **Tra cứu thủ tục/luật/cơ quan**: vào trang `/procedures`, `/legal`, `/agencies` — xem 8 thủ tục, 6 văn bản luật, 5 cơ quan mẫu (chủ đề Căn cước, Hộ khẩu, Hộ tịch, Xuất nhập cảnh).
4. **Upload ảnh giấy tờ** (trang Chat, nút đính kèm) → OCR đọc thông tin → AI gợi ý bước tiếp theo.
5. **Voice Chat**: bấm mic, nói câu hỏi → AI trả lời → bấm loa để nghe đọc lại (Web Speech API của trình duyệt, cần Chrome/Edge).
6. **Feedback**: bấm 👍/👎 dưới câu trả lời AI.
7. **Lịch sử hội thoại**: vào lại trang Chat, chọn hội thoại cũ — tin nhắn được lưu đầy đủ.

## Dữ liệu mẫu có sẵn (không cần tạo tay)

- 34 tỉnh/thành (administrative_units)
- 8 thủ tục hành chính (CCCD, hộ chiếu, khai sinh, kết hôn, thường trú, tạm trú, lý lịch tư pháp...)
- 6 văn bản pháp luật (Luật Căn cước 2023, Luật Cư trú, Luật Hộ tịch, Luật Xuất nhập cảnh...)
- 5 cơ quan nhà nước (C06-BCA, Cục Quản lý XNC, Công an Hà Nội, Sở Tư pháp Hà Nội, TTHCC Hà Nội)

## Nếu AI Provider không khả dụng khi demo (Offline Mode)

Hệ thống vẫn chạy đầy đủ với `LLM_PROVIDER=mock` — không cần internet/API key. RAG search (tìm thủ tục/luật liên quan) dùng embedding thật đã nạp sẵn, chỉ câu trả lời văn bản cuối là mẫu cố định. Đây là phương án dự phòng mặc định, không cần thao tác gì thêm.

## Sự cố thường gặp lúc demo

| Hiện tượng | Cách xử lý nhanh |
|---|---|
| Trang trắng / không load | `.\scripts\healthcheck.ps1` để xem service nào FAIL, sau đó `docker compose logs <service>` |
| Chat không trả lời (treo) | Circuit breaker có thể đang mở do AI Service lỗi liên tiếp — đợi 30s hoặc `docker compose restart ai-service` |
| Voice không hoạt động | Cần trình duyệt hỗ trợ Web Speech API (Chrome/Edge), không phải lỗi hệ thống |
| Mất dữ liệu sau khi demo xong | Chỉ xảy ra nếu chạy `reset.ps1` — dùng `stop.ps1`/`start.ps1` để giữ dữ liệu giữa các lần demo |
