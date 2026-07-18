# VAIC 2026 — Database Diagram (ERD)

PostgreSQL 16 + pgvector, 19 bảng nghiệp vụ + 2 bảng nối RBAC. Mọi thay đổi schema đi qua migration TypeORM (`synchronize: false`). Xem danh sách migration đầy đủ tại `backend/src/database/migrations/`.

## Sơ đồ quan hệ

```mermaid
erDiagram
    users ||--o{ conversations : "sở hữu"
    users ||--o| citizen_profiles : "1-1"
    users ||--o{ refresh_tokens : "phiên đăng nhập"
    users ||--o{ documents : "tải lên"
    users ||--o{ feedbacks : "đánh giá"
    users ||--o{ ai_training_data : "gián tiếp qua feedback"
    users ||--o{ audit_logs : "thực hiện hành động"
    users ||--o{ voice_logs : "sử dụng"
    users }o--o{ roles : "user_roles"
    roles }o--o{ permissions : "role_permissions"

    conversations ||--o{ messages : "chứa"
    conversations ||--o{ voice_logs : "kênh VOICE"
    messages ||--o{ feedbacks : "được đánh giá"
    messages ||--o| documents : "đính kèm (OCR)"
    messages ||--o{ voice_logs : "transcript"
    feedbacks ||--o| ai_training_data : "nguồn training"

    administrative_units ||--o{ administrative_units : "tỉnh → (self, không có xã trong seed)"
    administrative_units ||--o{ government_agencies : "địa bàn"
    administrative_units ||--o{ citizen_profiles : "tỉnh/xã cư trú"

    government_agencies ||--o{ government_agencies : "cơ quan cấp trên (self)"
    government_agencies ||--o{ administrative_procedures : "thực hiện"

    administrative_procedures ||--o{ procedure_steps : "các bước"
    administrative_procedures ||--o{ procedure_requirements : "giấy tờ/điều kiện"

    kb_chunks }o--|| administrative_procedures : "nguồn (polymorphic, không FK cứng)"
    kb_chunks }o--|| legal_documents : "nguồn (polymorphic)"
    kb_chunks }o--|| government_agencies : "nguồn (polymorphic)"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone UK
        varchar avatar_url
        enum status
        varchar reset_token_hash
        timestamptz deleted_at
    }

    citizen_profiles {
        uuid id PK
        uuid user_id FK "UK 1-1"
        varchar national_id UK
        date date_of_birth
        enum gender
        uuid province_id FK
        uuid ward_id FK
    }

    conversations {
        uuid id PK
        uuid user_id FK
        varchar title
        enum channel "CHAT | VOICE"
        enum status
        timestamptz deleted_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        enum sender_role "USER|ASSISTANT|SYSTEM"
        text content
        enum content_type
        uuid document_id FK
        jsonb metadata
    }

    feedbacks {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        smallint rating "1 | -1"
    }

    documents {
        uuid id PK
        uuid owner_id FK
        varchar storage_key UK
        enum purpose
        enum ocr_status
        jsonb extracted_data
    }

    administrative_procedures {
        uuid id PK
        varchar code UK
        varchar name
        varchar category
        varchar expected_result
        uuid agency_id FK
        enum status "ACTIVE|INACTIVE"
    }

    procedure_steps {
        uuid id PK
        uuid procedure_id FK
        int step_number
        varchar title
    }

    procedure_requirements {
        uuid id PK
        uuid procedure_id FK
        varchar name
        enum requirement_type "DOCUMENT|CONDITION"
    }

    legal_documents {
        uuid id PK
        varchar code UK
        varchar title
        enum doc_type
        text content
        varchar version
        enum status
    }

    government_agencies {
        uuid id PK
        varchar code UK
        varchar name
        enum level "CENTRAL|PROVINCE|WARD"
        uuid parent_id FK
        uuid admin_unit_id FK
        varchar working_hours
    }

    administrative_units {
        uuid id PK
        varchar code UK
        varchar name
        enum type "PROVINCE|WARD"
        uuid parent_id FK
    }

    kb_chunks {
        uuid id PK
        enum source_type "LEGAL_DOCUMENT|PROCEDURE|AGENCY"
        uuid source_id "polymorphic, không FK cứng"
        int chunk_index
        text content
        real_array embedding "384 chiều"
    }

    ai_training_data {
        uuid id PK
        enum source_type
        text input_text
        uuid feedback_id FK
        enum status
    }

    audit_logs {
        uuid id PK
        uuid actor_user_id FK
        varchar action
        varchar resource_type
        uuid resource_id
        jsonb metadata
    }

    voice_logs {
        uuid id PK
        uuid user_id FK
        uuid conversation_id FK
        uuid message_id FK
        text transcript
        real confidence
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
    }

    roles {
        uuid id PK
        varchar code UK "ADMIN | CITIZEN"
    }

    permissions {
        uuid id PK
        varchar code UK
        varchar module
    }
```

## Quy ước thiết kế

- **UUID PK** mọi bảng, `created_at`/`updated_at` chuẩn hóa qua `BaseDbEntity`.
- **Soft Delete + Audit + Optimistic Lock** (`AuditableEntity`) cho bảng dữ liệu người dùng/nghiệp vụ: `users`, `citizen_profiles`, `conversations`, `documents`. Bảng danh mục/tra cứu (procedures, legal_documents, agencies...) dùng `BaseDbEntity` (không soft delete) — "xóa" thực hiện bằng chuyển `status` (xem `known-limitations.md`).
- **`kb_chunks` là "vector database"** — không tách hệ CSDL riêng; `source_type`+`source_id` trỏ đa hình (polymorphic) tới 1 trong 3 bảng nguồn, không có FK cứng vì bản chất đa hình.
- **Mô hình hành chính 2 cấp** (`administrative_units`: chỉ `PROVINCE`/`WARD`, không có "huyện") — đúng cải cách hành chính Việt Nam hiệu lực 01/07/2025, quyết định kiến trúc đã chốt.
- **RBAC nhiều-nhiều**: `user_roles` (users↔roles), `role_permissions` (roles↔permissions) — 2 bảng nối, không có entity riêng tương ứng trong sơ đồ (join table thuần).

## Migration

Toàn bộ 6 migration (theo thứ tự áp dụng): `InitSchema` (17 bảng gốc) → `SeedRoles` → `SeedDemoData` (34 tỉnh/5 agencies/6 legal/8 procedures) → `AddDataLayerExtensions` (+`audit_logs`, `voice_logs`, cột mở rộng) → `SeedDemoDataExpansion` (mở rộng seed lên 20/20/30 + users) → `AddPasswordResetColumns`.
