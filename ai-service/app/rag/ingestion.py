"""Document Ingestion (NHIỆM VỤ 6).

Nguồn chính: dữ liệu trong PostgreSQL (văn bản pháp luật, thủ tục, cơ quan)
-> ghép văn bản -> chunking -> embedding -> vector store.

Bổ trợ: parser file PDF / DOCX / HTML / TXT cho tài liệu tải lên.
"""

import logging

from app.embedding.base import EmbeddingProvider
from app.rag.chunking import chunk_text
from app.rag.vector_store import KbChunk, VectorStore

logger = logging.getLogger("vaic.ai.ingestion")


# ---------- Parser file (PDF/Word/HTML/Text) ----------
def parse_file(data: bytes, filename: str) -> str:
    """Trích text từ file theo phần mở rộng. Ném ValueError nếu không hỗ trợ."""
    name = filename.lower()
    if name.endswith(".pdf"):
        import io

        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if name.endswith(".docx"):
        import io

        from docx import Document

        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    if name.endswith((".html", ".htm")):
        from bs4 import BeautifulSoup

        return BeautifulSoup(data.decode("utf-8", errors="ignore"), "html.parser").get_text(" ")
    if name.endswith((".txt", ".md")):
        return data.decode("utf-8", errors="ignore")
    raise ValueError(f"Định dạng file không hỗ trợ: {filename} (hỗ trợ pdf/docx/html/txt)")


# ---------- Ghép văn bản nguồn từ DB ----------
def _fetch_sources() -> list[tuple[str, str, str]]:
    """Đọc DB, trả list (source_type, source_id, full_text)."""
    from app.core.db import get_conn

    sources: list[tuple[str, str, str]] = []
    with get_conn() as conn, conn.cursor() as cur:
        # Văn bản pháp luật: tiêu đề + số hiệu + cơ quan ban hành + tóm tắt
        cur.execute(
            """SELECT id::text, code, title, doc_type::text, issuing_body, coalesce(summary,'')
               FROM legal_documents WHERE status = 'CON_HIEU_LUC'"""
        )
        for doc_id, code, title, doc_type, body, summary in cur.fetchall():
            text = f"{title} (số hiệu {code}, {doc_type} do {body} ban hành). {summary}"
            sources.append(("LEGAL_DOCUMENT", doc_id, text))

        # Thủ tục hành chính: mô tả + phí + thời hạn + các bước + giấy tờ
        cur.execute(
            """SELECT p.id::text, p.name, coalesce(p.description,''), coalesce(p.fee_text,''),
                      coalesce(p.processing_time_text,''), coalesce(p.legal_basis_text,''),
                      coalesce(a.name,'')
               FROM administrative_procedures p
               LEFT JOIN government_agencies a ON a.id = p.agency_id
               WHERE p.status = 'ACTIVE'"""
        )
        procedures = cur.fetchall()
        for pid, name, desc, fee, ptime, basis, agency in procedures:
            cur.execute(
                """SELECT step_number, title, coalesce(description,'')
                   FROM procedure_steps WHERE procedure_id = %s ORDER BY step_number""",
                (pid,),
            )
            steps = "; ".join(f"Bước {n}: {t}. {d}" for n, t, d in cur.fetchall())
            cur.execute(
                """SELECT name FROM procedure_requirements
                   WHERE procedure_id = %s ORDER BY sort_order""",
                (pid,),
            )
            reqs = "; ".join(r[0] for r in cur.fetchall())
            text = (
                f"Thủ tục: {name}. {desc} Cơ quan thực hiện: {agency}. "
                f"Lệ phí: {fee}. Thời hạn giải quyết: {ptime}. Căn cứ pháp lý: {basis}. "
                f"Hồ sơ cần chuẩn bị: {reqs}. Trình tự thực hiện: {steps}"
            )
            sources.append(("PROCEDURE", pid, text))

        # Cơ quan nhà nước: tên + địa chỉ + liên hệ
        cur.execute(
            """SELECT id::text, name, level::text, coalesce(address,''), coalesce(phone,''),
                      coalesce(email,''), coalesce(website,'')
               FROM government_agencies"""
        )
        for aid, name, level, address, phone, email, website in cur.fetchall():
            text = (
                f"Cơ quan nhà nước: {name} (cấp {level}). Địa chỉ: {address}. "
                f"Điện thoại: {phone}. Email: {email}. Website: {website}"
            )
            sources.append(("AGENCY", aid, text))

    return sources


def ingest_from_database(store: VectorStore, embedder: EmbeddingProvider) -> dict:
    """Pipeline ingestion đầy đủ: DB -> chunk -> embed -> vector store."""
    sources = _fetch_sources()
    total_chunks = 0

    for source_type, source_id, text in sources:
        pieces = chunk_text(text)
        if not pieces:
            continue
        embeddings = embedder.embed_passages(pieces)
        chunks = [
            KbChunk(
                source_type=source_type,
                source_id=source_id,
                chunk_index=i,
                content=piece,
                embedding=embeddings[i],
                token_count=len(piece) // 4,  # ước lượng thô
            )
            for i, piece in enumerate(pieces)
        ]
        # Xóa chunk cũ của nguồn trước khi ghi (tránh rác khi tài liệu ngắn lại)
        store.delete_source(source_type, source_id)
        total_chunks += store.upsert(chunks)

    logger.info("Ingestion xong: %d nguồn, %d chunks", len(sources), total_chunks)
    return {"sources": len(sources), "chunks": total_chunks}
