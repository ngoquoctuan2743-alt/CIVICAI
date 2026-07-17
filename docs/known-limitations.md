# Known Limitations — sau PHASE 6

Tổng hợp các giới hạn đã biết và được chấp nhận cho giai đoạn demo (không phải bug, không cần sửa trừ khi hướng tới production thật):

1. **Mock LLM**: Chưa cấu hình `ANTHROPIC_API_KEY` → Chat/Voice/OCR trả lời/dữ liệu ở chế độ mock. RAG search (embedding thật) hoạt động đúng độc lập.
2. **In-memory Rate Limit / Cache / Circuit Breaker**: đơn instance, không chia sẻ giữa nhiều container — cần Redis nếu scale production.
3. **JWT ở localStorage** (frontend): chấp nhận được cho demo, không phù hợp production thật (rủi ro XSS lý thuyết).
4. **File upload lưu local disk**: mất khi container restart — đúng thiết kế Storage demo đã chốt.
5. **`docker-compose.yml` chỉ có service `postgres`**: backend/ai-service/frontend/nginx chạy tay theo README, sẽ đóng gói đầy đủ ở Phase 7 (Release Candidate).
6. **ESLint chưa cấu hình** ở backend và frontend (script `lint` tồn tại nhưng thiếu config) — không chặn demo, nhưng nên bổ sung nếu có thời gian.
7. **Chưa test Prompt Injection với LLM thật** — chỉ review tĩnh do thiếu API key trong môi trường QA.
8. **Health check (`GET /health`) chỉ là liveness**, chưa kiểm tra kết nối DB/AI Service (readiness) — dự kiến bổ sung ở Phase 7 (Health Check/Monitoring).
9. **Next.js frontend đang chạy dev mode** (`next dev`) trong môi trường QA — số liệu performance thật cần đo lại với production build ở Phase 7.
