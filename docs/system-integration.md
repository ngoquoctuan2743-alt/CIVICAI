# VAIC 2026 — System Integration (PHASE 4)

## Kiến trúc tích hợp

```
Frontend (Next.js) ──HTTP+JWT──▶ Backend (NestJS)
                                       │
                          axios (timeout, retry, circuit breaker)
                                       ▼
                                 AI Service (FastAPI)
                                       │
                              embedding + pgvector search
                                       ▼
                            Claude API (claude-opus-4-8)

Backend ──TypeORM──▶ PostgreSQL (users, conversations, messages, documents,
                                 feedbacks, kb_chunks — dùng chung với AI Service)
```

## Sequence: Chat Workflow (RAG)

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant F as Frontend
    participant B as Backend
    participant AI as AI Service
    participant DB as PostgreSQL

    U->>F: Gõ "Tôi muốn làm CCCD"
    F->>B: POST /conversations/:id/messages
    B->>DB: Lưu Message (USER)
    B->>AI: POST /ai/chat {message, history}
    AI->>AI: Intent Detection
    AI->>DB: Vector search (kb_chunks)
    AI->>AI: Context Builder + LLM (Claude)
    AI-->>B: AiResponse {answer, sources, ...}
    B->>DB: Lưu Message (ASSISTANT) + metadata
    B-->>F: {userMessage, assistantMessage, aiError:null}
    F-->>U: Hiển thị câu trả lời + nguồn tham khảo

    Note over B,AI: Nếu AI lỗi/timeout: Circuit Breaker chặn nhanh,<br/>userMessage vẫn được lưu, trả aiError thân thiện
```

## Sequence: OCR Workflow

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant F as Frontend
    participant B as Backend
    participant AI as AI Service

    U->>F: Chọn ảnh CCCD, bấm Upload
    F->>B: POST /documents/analyze (multipart)
    B->>B: Validate mimetype + size
    B->>B: Lưu file local disk
    B->>DB: Tạo Document (ocrStatus=PROCESSING)
    B->>AI: POST /ai/document {imageBase64, mediaType}
    AI->>AI: Claude Vision đọc ảnh
    AI-->>B: {docType, fields, rawText, confidence}
    B->>DB: Cập nhật Document (COMPLETED)
    B-->>F: {documentId, docType, fields, suggestedActions}
    F-->>U: Hiển thị kết quả + gợi ý bước tiếp theo
```

## Sequence: Voice Workflow

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant F as Frontend (Web Speech API)
    participant B as Backend
    participant AI as AI Service

    U->>F: Bấm mic, nói
    F->>F: STT (trình duyệt) → transcript
    F->>B: POST /conversations/:id/messages (conversation.channel=VOICE)
    B->>AI: POST /ai/voice {transcript, history}
    AI-->>B: AiResponse {answer, speakable:true, ...}
    B->>DB: Lưu Message (ASSISTANT, metadata.speakable=true)
    B-->>F: assistantMessage
    F->>F: TTS (trình duyệt) đọc to answer
    F-->>U: Nghe câu trả lời
```

## API Mapping (Frontend ↔ Backend, không đổi so với thiết kế đã đóng băng)

| Frontend action | Backend endpoint |
|---|---|
| Đăng nhập/Đăng ký | `POST /auth/login`, `/auth/register` |
| Gửi tin nhắn chat/voice | `POST /conversations/:id/messages` |
| Đánh giá câu trả lời | `POST /conversations/:id/messages/:messageId/feedback` |
| Upload OCR | `POST /documents/analyze` |
| Tra cứu thủ tục/luật/cơ quan | `GET /procedures`, `/legal/documents`, `/government/agencies` (có cache) |

## Known Issues (ghi nhận minh bạch)

1. **Chưa có `ANTHROPIC_API_KEY`** — mọi câu trả lời hiện dùng Mock LLM; RAG search (embedding thật) đã verify đúng, nhưng nhánh Chat với Mock LLM trả `intent="mock"` nên không hiển thị sources thật (đã verify pipeline structure đúng).
2. Token JWT lưu `localStorage` ở Frontend — chấp nhận được cho demo, không phù hợp production (rủi ro XSS).
3. Rate Limit / Circuit Breaker / Cache là **in-memory, đơn instance** — không phù hợp triển khai nhiều container (cần Redis ở production thật).
4. File upload lưu local disk — mất khi container restart (đúng thiết kế Storage demo đã chốt).
