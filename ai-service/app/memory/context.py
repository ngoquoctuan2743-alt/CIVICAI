"""AI Memory (NHIỆM VỤ 9) — quản lý context window của hội thoại.

AI service là stateless: lịch sử do backend/caller gửi kèm request;
module này chịu trách nhiệm CẮT lịch sử dài để không tràn context.
"""

from app.llm.base import LlmMessage

# Giới hạn mặc định cho demo (đủ rộng, tránh tốn token)
MAX_MESSAGES = 12
MAX_TOTAL_CHARS = 8000


def trim_history(
    history: list[LlmMessage],
    max_messages: int = MAX_MESSAGES,
    max_total_chars: int = MAX_TOTAL_CHARS,
) -> list[LlmMessage]:
    """Giữ các tin nhắn MỚI NHẤT trong giới hạn số lượng và tổng ký tự.

    Đảm bảo lịch sử trả về bắt đầu bằng lượt 'user' (yêu cầu của LLM API).
    """
    trimmed = history[-max_messages:]

    total = 0
    result: list[LlmMessage] = []
    for msg in reversed(trimmed):  # đi từ mới nhất về cũ
        total += len(msg.content)
        if total > max_total_chars and result:
            break
        result.append(msg)
    result.reverse()

    # Cắt các lượt assistant mồ côi ở đầu (hội thoại phải mở đầu bằng user)
    while result and result[0].role != "user":
        result.pop(0)
    return result
