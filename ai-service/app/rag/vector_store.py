"""Vector Store interface + cài đặt PGVector (NHIỆM VỤ 5).

Thay bằng Chroma/FAISS/Qdrant: viết class mới cùng interface VectorStore.
Lưu ý thiết kế đã duyệt: cột kb_chunks.embedding giữ float4[] (schema đóng băng),
tìm kiếm bằng cast `embedding::vector` của pgvector — đủ nhanh ở quy mô demo.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class KbChunk:
    """Một đoạn tri thức đưa vào kho vector."""

    source_type: str  # LEGAL_DOCUMENT | PROCEDURE | AGENCY
    source_id: str
    chunk_index: int
    content: str
    embedding: list[float] | None = None
    token_count: int | None = None


@dataclass
class RetrievedChunk:
    """Kết quả truy hồi kèm điểm tương đồng cosine (0..1)."""

    source_type: str
    source_id: str
    chunk_index: int
    content: str
    score: float
    title: str = field(default="")


class VectorStore(ABC):
    """Interface kho vector."""

    @abstractmethod
    def upsert(self, chunks: list[KbChunk]) -> int:
        """Ghi/cập nhật chunks; trả về số bản ghi đã ghi."""

    @abstractmethod
    def search(
        self, embedding: list[float], top_k: int, source_types: list[str] | None = None
    ) -> list[RetrievedChunk]:
        """Tìm top_k chunk gần nhất (cosine)."""

    @abstractmethod
    def delete_source(self, source_type: str, source_id: str) -> None:
        """Xóa toàn bộ chunk của một tài liệu nguồn (re-index)."""


def _vec_literal(embedding: list[float]) -> str:
    """Chuyển list float -> literal '[...]' cho kiểu vector của pgvector."""
    return "[" + ",".join(f"{x:.8f}" for x in embedding) + "]"


class PgVectorStore(VectorStore):
    """Kho vector trên bảng kb_chunks (PostgreSQL + pgvector)."""

    def upsert(self, chunks: list[KbChunk]) -> int:
        from app.core.db import get_conn

        with get_conn() as conn, conn.cursor() as cur:
            for c in chunks:
                cur.execute(
                    """
                    INSERT INTO kb_chunks
                      (id, source_type, source_id, chunk_index, content, embedding, token_count)
                    VALUES (uuid_generate_v4(), %s::kb_source_type, %s, %s, %s, %s::real[], %s)
                    ON CONFLICT ON CONSTRAINT "uq_kb_chunks_source_index" DO UPDATE
                      SET content = EXCLUDED.content,
                          embedding = EXCLUDED.embedding,
                          token_count = EXCLUDED.token_count,
                          updated_at = now()
                    """,
                    (c.source_type, c.source_id, c.chunk_index, c.content, c.embedding, c.token_count),
                )
            conn.commit()
        return len(chunks)

    def search(
        self, embedding: list[float], top_k: int, source_types: list[str] | None = None
    ) -> list[RetrievedChunk]:
        from app.core.db import get_conn

        vec = _vec_literal(embedding)
        type_filter = "AND source_type = ANY(%s::kb_source_type[])" if source_types else ""
        params: list = [vec]
        if source_types:
            params.append(source_types)
        params += [vec, top_k]

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT source_type::text, source_id::text, chunk_index, content,
                       1 - (embedding::vector <=> %s::vector) AS score
                FROM kb_chunks
                WHERE embedding IS NOT NULL {type_filter}
                ORDER BY embedding::vector <=> %s::vector
                LIMIT %s
                """,
                params,
            )
            rows = cur.fetchall()

        return [
            RetrievedChunk(
                source_type=r[0], source_id=r[1], chunk_index=r[2], content=r[3], score=float(r[4])
            )
            for r in rows
        ]

    def delete_source(self, source_type: str, source_id: str) -> None:
        from app.core.db import get_conn

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "DELETE FROM kb_chunks WHERE source_type = %s::kb_source_type AND source_id = %s",
                (source_type, source_id),
            )
            conn.commit()
