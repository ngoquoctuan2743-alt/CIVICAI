"""Chunking — cắt văn bản thành đoạn có overlap, ưu tiên cắt tại ranh giới câu."""

from app.core.config import get_settings


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    """Cắt text thành các đoạn ~chunk_size ký tự, chồng lấn overlap ký tự.

    Ưu tiên cắt tại dấu chấm câu/xuống dòng gần nhất để giữ trọn câu.
    """
    settings = get_settings()
    size = chunk_size or settings.chunk_size
    lap = overlap if overlap is not None else settings.chunk_overlap

    text = " ".join(text.split())  # chuẩn hóa khoảng trắng
    if not text:
        return []
    if len(text) <= size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            # lùi về dấu kết câu gần nhất trong nửa sau của đoạn
            boundary = max(text.rfind(". ", start + size // 2, end), text.rfind("; ", start + size // 2, end))
            if boundary > start:
                end = boundary + 1
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - lap, start + 1)
    return [c for c in chunks if c]
