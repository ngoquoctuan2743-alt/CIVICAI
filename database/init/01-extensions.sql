-- ==================================================
-- VAIC 2026 - Khởi tạo extension PostgreSQL
-- Chạy tự động lần đầu khi container postgres khởi tạo volume.
-- ==================================================

-- Sinh UUID (uuid_generate_v4) cho primary key
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector search cho RAG (embedding 384 chiều - multilingual-e5-small)
CREATE EXTENSION IF NOT EXISTS vector;
