# Shared

Tài nguyên dùng chung giữa Backend, Frontend và AI Service.

> **Trạng thái:** Placeholder — chưa có nội dung.

## Cấu trúc

```
shared/
├── contracts/   # Định nghĩa API contract giữa các service (chưa có)
├── types/       # Kiểu dữ liệu dùng chung (chưa có)
└── constants/   # Hằng số dùng chung (chưa có)
```

## Quy tắc

- Không chứa business logic.
- Không phụ thuộc vào bất kỳ module nào khác (backend/frontend/ai-service chỉ được phụ thuộc vào shared, không ngược lại).
