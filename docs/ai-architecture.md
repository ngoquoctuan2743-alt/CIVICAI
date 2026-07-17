# VAIC 2026 — AI Architecture (PHASE 3)

## Tổng quan

`ai-service` (FastAPI, Python 3.11, chạy Docker) là AI Engine **stateless**: nhận câu hỏi + lịch sử, trả `AiResponse` chuẩn. Dùng chung PostgreSQL với backend (kho tri thức `kb_chunks` + bảng nguồn).

```
Người dân ──> Backend (NestJS) ──> AI Service ──> Claude API (claude-opus-4-8)
                   │                    │
                   └── PostgreSQL <─────┘  (kb_chunks + pgvector, nguồn: luật/thủ tục/cơ quan)
```

## LLM Adapter (Adapter Pattern)

- Interface `LlmClient` (`app/llm/base.py`): `complete`, `complete_json` (structured output), `vision_extract`.
- Adapter đã cài đặt: **ClaudeAdapter** (`claude-opus-4-8`). Đã đăng ký chỗ: openai/gemini/local (NotImplementedAdapter), **mock** (test/demo không cần key).
- Đổi provider: env `LLM_PROVIDER` — không sửa code nghiệp vụ.

## Prompt Strategy (`app/prompt/templates.py`)

| Prompt | Vai trò |
|---|---|
| `SYSTEM_PROMPT` | Nhân cách VAIC + 5 nguyên tắc an toàn (chỉ trả lời từ nguồn, trích dẫn [n], không bịa, không tư vấn tranh chấp, từ chối ngoài phạm vi) |
| `INTENT_SYSTEM_PROMPT` + `INTENT_SCHEMA` | Phân loại 6 intent, JSON `{intent, confidence, category}` |
| `build_rag_system_prompt(context)` | System + nguồn đánh số [1..n] |
| `OCR_PROMPT` + `OCR_SCHEMA` | Đọc giấy tờ → JSON `{docType, fields, rawText, confidence}` |

## RAG Flow

```
Câu hỏi → embed ("query: ...") → PgVectorStore.search (cast embedding::vector, cosine)
       → lọc score ≥ 0.75 → không đủ nguồn? trả lời an toàn KHÔNG gọi LLM
       → Context Builder (đánh số nguồn + tiêu đề) → Claude → answer kèm trích dẫn [n]
```
- Embedding: `intfloat/multilingual-e5-small` (384d, local, prefix query/passage).
- Vector store: interface `VectorStore` — thay Chroma/FAISS/Qdrant bằng class mới.
- Intent → loại nguồn: legal→LEGAL_DOCUMENT+PROCEDURE; procedure→PROCEDURE+LEGAL; agency→AGENCY+PROCEDURE.

## Ingestion Flow

`POST /ai/ingest`: đọc DB (luật CON_HIEU_LUC, thủ tục ACTIVE kèm bước + giấy tờ, cơ quan) → ghép văn bản → chunk 700/overlap 100 (cắt tại ranh giới câu) → embed batch → upsert `kb_chunks` (xóa chunk cũ của nguồn trước). Parser file PDF/DOCX/HTML/TXT: `app/rag/ingestion.py::parse_file`.

## OCR Flow

`POST /ai/document` `{imageBase64, mediaType}` → Claude Vision đọc ảnh → JSON: loại giấy tờ (CCCD/khai sinh/đơn từ/biểu mẫu), fields (số, họ tên, ngày sinh, địa chỉ...), rawText, confidence. Engine bọc sau interface `OcrEngine`.

## Voice Flow

Đã chốt: **STT/TTS ở trình duyệt** (Web Speech API vi-VN). Client thu âm → transcript → `POST /ai/voice {transcript, history}` → pipeline chat → response `speakable=true` → client đọc to bằng TTS. Server có interface `SpeechToText/TextToSpeech` (`VOICE_ENGINE`) để nâng cấp whisper sau.

## Memory

AI service stateless — lịch sử do caller gửi. `trim_history`: giữ ≤12 tin nhắn mới nhất, ≤8000 ký tự, đảm bảo mở đầu bằng lượt `user`. Lưu trữ lâu dài thuộc backend (`conversations`/`messages`).

## API Guide

| API | Body | Trả về |
|---|---|---|
| `POST /ai/chat` | `{message, history[]}` | `AiResponse` |
| `POST /ai/voice` | `{transcript, history[]}` | `AiResponse` (`speakable=true`) |
| `POST /ai/document` | `{imageBase64, mediaType}` | JSON OCR |
| `POST /ai/search` | `{query, topK, sourceTypes?}` | chunks + score (không LLM) |
| `GET /ai/history` | header Authorization | proxy backend `/conversations` |
| `POST /ai/ingest` | — | `{sources, chunks}` (nội bộ — không expose production) |

`AiResponse`: `{answer, sources[{sourceType,sourceId,title,excerpt,score}], confidence, intent{intent,confidence,category}, relatedProcedures[], relatedLaws[], agencies[], suggestedActions[], speakable}`.

## Chạy & Test

```bash
cd ai-service
docker build -t vaic-ai-service .
# Chạy cùng network với postgres (compose network: civicai_default)
docker run --rm -p 8000:8000 --network civicai_default \
  -e DB_HOST=postgres -e DB_PORT=5432 \
  -e ANTHROPIC_API_KEY=sk-ant-... vaic-ai-service
# Nạp kho tri thức lần đầu:
curl -X POST http://localhost:8000/ai/ingest
# Test (mock LLM + mock vector store):
docker run --rm vaic-ai-service pytest -q
```
