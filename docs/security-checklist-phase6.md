# Security Checklist — PHASE 6

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| JWT | ✅ PASS | Access token 15p, refresh token xoay vòng (rotation), refresh token lưu DB dạng SHA-256 hash (không lưu plaintext) |
| Password Hash | ✅ PASS | `bcryptjs`, không có trường password nào trả về client (kiểm tra response `/auth/register`, `/auth/login`) |
| Rate Limiting | ✅ PASS | Verify thật: 10 request/60s đầu qua, request thứ 11-12 nhận `429` |
| Input Validation | ✅ PASS | `class-validator` DTO chặn email sai định dạng, mật khẩu yếu, enum sai giá trị |
| SQL Injection | ✅ PASS | TypeORM query có tham số hóa (`$1, $2...`); payload dạng `' OR '1'='1` bị chặn ở tầng validate email trước khi tới DB |
| XSS | ✅ PASS (có ghi chú) | `fullName`/nội dung tin nhắn không sanitize ở API, nhưng frontend không có `dangerouslySetInnerHTML` và Markdown render không bật `rehype-raw` → không khai thác được trên frontend hiện tại. Xem NOTE-02 trong Bug List. |
| CSRF | ➖ N/A | API dùng Bearer token trong header (không dùng cookie session) → không thuộc mô hình tấn công CSRF cổ điển |
| File Upload Validation | 🔴 → ✅ FIXED | Phát hiện: chỉ tin mimetype client khai báo. Đã vá bằng kiểm tra magic bytes thật. Xem BUG-01. |
| Prompt Injection cơ bản | ✅ PASS (static review) | System prompt có điều khoản chống ghi đè tường minh; Claude API dùng tham số `system=` tách biệt `messages=`. Chưa test được với LLM thật do thiếu API key — xem Known Limitations. |
| Secrets không hard-code | ✅ PASS | Grep toàn repo (`sk-ant-`, `AIzaSy`, PEM key header) không phát hiện secret hard-code; `.env` thật đã bị `.gitignore` loại trừ khỏi git |
| CORS | ✅ PASS | Cấu hình whitelist origin qua `CORS_ORIGINS`, không dùng wildcard `*` |

## Known Limitations (bảo mật)

1. Rate limit/cache/circuit breaker là in-memory, đơn instance — không phù hợp khi scale nhiều container (đã ghi nhận từ Phase 4, cần Redis ở production thật).
2. JWT lưu ở `localStorage` phía Frontend — chấp nhận được cho demo, có rủi ro XSS về lý thuyết nếu sau này có lỗ hổng XSS thật (hiện tại chưa có).
3. Prompt injection chỉ được kiểm tra tĩnh (đọc code), chưa test động với LLM thật vì `ANTHROPIC_API_KEY` chưa được cấu hình trong môi trường QA.
