"""Mock LLM Adapter — dùng cho unit test và chạy demo không có API key.

Trả lời xác định (deterministic) để test pipeline độc lập với LLM thật.
"""

from app.llm.base import LlmClient, LlmMessage


class MockLlmAdapter(LlmClient):
    """LLM giả: trả câu cố định; JSON thì suy ra từ schema hoặc kịch bản cài sẵn."""

    def __init__(self, canned_json: dict | None = None, canned_text: str | None = None) -> None:
        self.canned_json = canned_json
        self.canned_text = canned_text
        self.calls: list[dict] = []  # ghi lại lời gọi để test assert

    async def complete(self, system, messages: list[LlmMessage], max_tokens=None) -> str:
        self.calls.append({"type": "complete", "system": system, "messages": messages})
        if self.canned_text is not None:
            return self.canned_text
        last = messages[-1].content if messages else ""
        return f"[MOCK] Đã nhận câu hỏi: {last[:100]}"

    async def complete_json(self, system, messages, schema, max_tokens=None) -> dict:
        self.calls.append({"type": "complete_json", "system": system, "schema": schema})
        if self.canned_json is not None:
            return self.canned_json
        # Suy JSON tối thiểu từ schema để pipeline không gãy
        result: dict = {}
        for key, prop in schema.get("properties", {}).items():
            t = prop.get("type")
            result[key] = 0.5 if t == "number" else ([] if t == "array" else "mock")
        return result

    async def vision_extract(self, image_b64, media_type, prompt, schema) -> dict:
        self.calls.append({"type": "vision_extract", "media_type": media_type})
        if self.canned_json is not None:
            return self.canned_json
        return {"docType": "CCCD", "fields": {}, "rawText": "[MOCK OCR]", "confidence": 0.5}
