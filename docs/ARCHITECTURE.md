# VAIC 2026 — Architecture Diagram

## Sơ đồ thành phần (Container Diagram)

```mermaid
flowchart TB
    citizen(("Người dân<br/>(trình duyệt)"))
    admin(("Quản trị viên<br/>(trình duyệt)"))

    subgraph docker["Docker Compose — 1 mạng nội bộ"]
        nginx["Nginx Gateway<br/>:80"]

        subgraph frontend_box["Frontend"]
            frontend["Next.js 15<br/>App Router · Tailwind<br/>:3001"]
        end

        subgraph backend_box["Backend"]
            backend["NestJS 11 + TypeORM<br/>REST API · JWT Auth · RBAC<br/>:3100"]
        end

        subgraph ai_box["AI Service"]
            ai["FastAPI<br/>Chat Engine · RAG Pipeline<br/>Intent · OCR · Voice interface<br/>:8000"]
        end

        subgraph db_box["Database"]
            postgres[("PostgreSQL 16<br/>+ pgvector<br/>:5433→5432")]
        end

        claude{{"Claude API<br/>(claude-opus-4-8)<br/>bên ngoài Docker"}}
    end

    citizen -->|HTTPS| nginx
    admin -->|HTTPS| nginx
    nginx --> frontend
    nginx --> backend
    nginx --> ai

    frontend -->|"REST + JWT<br/>(Bearer token)"| backend
    backend -->|"axios (timeout/retry/<br/>circuit breaker)"| ai
    backend -->|TypeORM| postgres
    ai -->|"psycopg (đọc/ghi kb_chunks,<br/>đọc procedures/legal/agencies)"| postgres
    ai -->|"Anthropic SDK<br/>(khi LLM_PROVIDER=claude)"| claude
    frontend -.->|"Web Speech API<br/>(STT/TTS tại trình duyệt)"| citizen
```

## Vai trò từng thành phần

| Thành phần | Công nghệ | Trách nhiệm |
|---|---|---|
| **Nginx** | nginx:alpine | Reverse proxy gateway — 1 cổng duy nhất (`:80`) cho demo/nộp bài, route theo path tới frontend/backend/ai-service |
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind | Giao diện web, quản lý phiên đăng nhập (JWT trong localStorage), gọi Backend qua REST, xử lý Voice (Web Speech API) hoàn toàn phía client |
| **Backend** | NestJS 11 + TypeORM | REST API duy nhất mà Frontend gọi trực tiếp; xác thực JWT + RBAC (secure-by-default); điều phối gọi sang AI Service; sở hữu toàn bộ nghiệp vụ CRUD (users, procedures, legal, agencies, conversations, documents, admin) |
| **AI Service** | Python FastAPI | Chat Engine (Intent Detection + RAG Pipeline), Embedding Pipeline (multilingual-e5-small, local), Vector Search (pgvector trên `kb_chunks`), OCR (Claude Vision), Voice interface (placeholder server-side, STT/TTS thật ở trình duyệt) |
| **PostgreSQL + pgvector** | PostgreSQL 16 | Cơ sở dữ liệu chính DÙNG CHUNG giữa Backend và AI Service — không có "vector database" tách riêng, `kb_chunks.embedding` là cột `float4[]` cast sang `vector` khi truy vấn (quyết định kiến trúc đã chốt Phase 3, tránh vận hành 2 hệ CSDL) |
| **Claude API** | Anthropic `claude-opus-4-8` | LLM sinh câu trả lời + phân loại ý định + đọc ảnh (vision); qua Adapter Pattern nên có thể đổi provider bằng cấu hình (`LLM_PROVIDER=mock` khi demo không có API key) |

## Nguyên tắc kiến trúc đã chốt (không đổi trong toàn bộ dự án)

1. **Frontend KHÔNG gọi thẳng AI Service** — luôn đi qua Backend (Backend là API Gateway nghiệp vụ duy nhất).
2. **1 cơ sở dữ liệu chung** — không tách vector DB riêng, giảm độ phức tạp vận hành cho MVP.
3. **Voice xử lý ở trình duyệt** (Web Speech API) — Backend/AI Service chỉ nhận transcript văn bản, không xử lý audio thô (trừ file ghi âm đính kèm qua OCR/Documents nếu có).
4. **LLM Adapter Pattern** — đổi nhà cung cấp LLM chỉ bằng biến môi trường, không sửa code nghiệp vụ.
5. **Response Format thống nhất** toàn Backend: `{ success, data | error, meta }`.

## Sơ đồ luồng nghiệp vụ chi tiết

Xem [`docs/system-integration.md`](system-integration.md) — sequence diagram Mermaid cho Chat/OCR/Voice workflow, và [`docs/ai-architecture.md`](ai-architecture.md) — chi tiết AI Engine (Prompt Manager, RAG Pipeline, Context Builder).
