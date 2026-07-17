"""Unit test chunking."""

from app.rag.chunking import chunk_text


def test_van_ban_ngan_tra_ve_mot_chunk():
    assert chunk_text("Xin chào Việt Nam.", chunk_size=100, overlap=10) == ["Xin chào Việt Nam."]


def test_van_ban_rong():
    assert chunk_text("   ", chunk_size=100, overlap=10) == []


def test_van_ban_dai_duoc_cat_co_overlap():
    text = ". ".join(f"Câu số {i} trong văn bản pháp luật" for i in range(60))
    chunks = chunk_text(text, chunk_size=300, overlap=50)

    assert len(chunks) > 1
    assert all(len(c) <= 320 for c in chunks)  # không vượt quá size (dung sai ranh giới câu)
    # Ghép lại phải phủ toàn bộ nội dung gốc (câu đầu và câu cuối đều xuất hiện)
    joined = " ".join(chunks)
    assert "Câu số 0" in joined
    assert "Câu số 59" in joined


def test_chuan_hoa_khoang_trang():
    chunks = chunk_text("a\n\n  b\t c", chunk_size=100, overlap=0)
    assert chunks == ["a b c"]
