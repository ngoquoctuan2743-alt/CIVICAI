"""Unit test AI Memory — cắt context window."""

from app.llm.base import LlmMessage
from app.memory.context import trim_history


def _msgs(n: int) -> list[LlmMessage]:
    out = []
    for i in range(n):
        role = "user" if i % 2 == 0 else "assistant"
        out.append(LlmMessage(role, f"Tin nhắn {i}"))
    return out


def test_giu_nguyen_lich_su_ngan():
    history = _msgs(4)
    assert trim_history(history) == history


def test_cat_theo_so_luong_tin_nhan():
    result = trim_history(_msgs(30), max_messages=10)
    assert len(result) <= 10
    assert result[-1].content == "Tin nhắn 29"  # giữ tin MỚI nhất


def test_cat_theo_tong_ky_tu():
    history = [
        LlmMessage("user", "a" * 5000),
        LlmMessage("assistant", "b" * 5000),
        LlmMessage("user", "câu hỏi cuối"),
    ]
    result = trim_history(history, max_total_chars=6000)
    assert result[-1].content == "câu hỏi cuối"
    assert sum(len(m.content) for m in result) <= 11000  # tin vượt ngưỡng đầu tiên vẫn được giữ


def test_lich_su_phai_bat_dau_bang_user():
    history = [LlmMessage("assistant", "mồ côi"), LlmMessage("user", "hỏi"), LlmMessage("assistant", "đáp")]
    result = trim_history(history)
    assert result[0].role == "user"
