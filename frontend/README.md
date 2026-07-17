# VAIC 2026 Frontend

Giao diện Next.js 15 (App Router) + TypeScript + Tailwind CSS.

> **Trạng thái:** ✅ PHASE 5 (Frontend Completion) hoàn thành — 12 trang, tích hợp Backend/AI thật.

## Chạy dự án

```bash
npm install
cp .env.example .env.local   # chỉnh NEXT_PUBLIC_API_BASE_URL nếu backend chạy port khác
npm run dev                  # http://localhost:3001
```

Yêu cầu: Backend (port 3100) và AI Service phải đang chạy — xem README gốc dự án.

## Frontend Architecture

```
src/
├── app/                      App Router (file-based routing)
│   ├── page.tsx               Landing (public)
│   ├── (auth)/                route group — layout không Sidebar
│   │   ├── login/register/forgot-password/page.tsx
│   └── (app)/                 route group — layout có Sidebar + AuthGuard
│       ├── layout.tsx           AppShell: Sidebar (desktop) / Header+MobileNav (mobile)
│       ├── chat/page.tsx        Danh sách hội thoại
│       ├── chat/[conversationId]/page.tsx   Chat + Voice + OCR tích hợp
│       ├── procedures/page.tsx + [id]/page.tsx
│       ├── legal/page.tsx
│       ├── agencies/page.tsx
│       └── profile/page.tsx
├── components/
│   ├── ui/                    Primitives: Button, Input, Card, Badge, Skeleton, SearchBar...
│   ├── layout/                Header, Sidebar, MobileNav, AuthGuard, Logo
│   ├── chat/                  ChatBubble, ChatInput, TypingIndicator, MicButton,
│   │                          WaveAnimation, MessageSources, FeedbackButtons, ConversationList
│   ├── ocr/                   FilePreview, OcrResultCard
│   ├── procedures/            ProcedureCard
│   ├── legal/                 LegalDocCard
│   └── agencies/              AgencyCard
├── services/                  Lớp gọi API (1 file/module backend)
├── stores/                    AuthContext, ToastContext (Context API)
├── hooks/                     use-speech-recognition (STT), use-text-to-speech (TTS),
│                              use-debounced-value, use-media-query
├── lib/                       api-client (fetch+JWT+refresh), constants, cn
└── types/api.ts                Type khớp response Backend
```

## Component Tree (rút gọn)

```
RootLayout (AuthProvider, ToastProvider)
├─ LandingPage
├─ AuthLayout → Login / Register / ForgotPassword
└─ AppLayout (AuthGuard)
   ├─ Sidebar (desktop) / Header + MobileNav (mobile)
   └─ ChatDetailPage
      ├─ ChatBubble × n
      │  ├─ MarkdownRenderer
      │  ├─ MessageSources
      │  └─ FeedbackButtons
      ├─ OcrResultCard (khi có ảnh được phân tích)
      ├─ TypingIndicator (khi đang chờ AI)
      └─ ChatInput
         ├─ FilePreview (đính kèm ảnh)
         └─ MicButton → WaveAnimation
```

## State Management

Giữ tối giản, không thêm Redux/Zustand/TanStack Query:

| Loại state | Giải pháp |
|---|---|
| Auth (user, token) | `AuthContext` — Context API, token lưu `localStorage` |
| Toast notification | `ToastContext` — Context API |
| Dữ liệu công khai (Procedures/Legal/Agencies) | `useState` + `useEffect` gọi service, debounce search |
| Chat/Voice/OCR (tương tác cao) | `useState`/`useReducer` cục bộ trong trang |

## Routing

Next.js App Router, 2 route group:
- `(auth)` — layout không Sidebar, dùng cho Login/Register/Forgot-password.
- `(app)` — layout có Sidebar/Header/MobileNav + `AuthGuard` (redirect `/login` nếu chưa đăng nhập).

`/` (Landing) là route public duy nhất ngoài `(auth)`.

## API Mapping

| Frontend service | Backend endpoint |
|---|---|
| `auth.service` | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh` (tự động trong `api-client`) |
| `conversation.service` | `/conversations`, `/conversations/:id/messages`, `.../feedback` |
| `documents.service` | `/documents/analyze`, `/documents/mine` |
| `procedures.service` | `/procedures`, `/procedures/:id` |
| `legal.service` | `/legal/documents`, `/legal/documents/:id` |
| `agencies.service` | `/government/agencies`, `/government/agencies/:id` |

## Voice & OCR — thiết kế đã chốt

- **Voice**: STT/TTS chạy hoàn toàn ở trình duyệt (Web Speech API, `vi-VN`). Server chỉ nhận transcript qua API tin nhắn thông thường; `conversation.channel` quyết định backend gọi `/ai/chat` hay `/ai/voice`. Trình duyệt không hỗ trợ (ngoài Chrome/Edge) → nút mic tự ẩn (`isSupported=false`), không làm vỡ giao diện.
- **OCR**: đính kèm ảnh trong ô chat → `POST /documents/analyze` (độc lập với `conversationId` theo đúng API đã đóng băng) → kết quả hiển thị tại chỗ trong dòng thời gian hội thoại (không phải tin nhắn thật lưu ở backend).

## Testing đã thực hiện (PHASE 5)

Build + typecheck sạch (`npx tsc --noEmit`, `npm run build`). Verify thật qua Browser: đăng ký → tự đăng nhập → tạo hội thoại → gửi tin nhắn → AI trả lời hiển thị → tìm kiếm thủ tục (debounce) → chi tiết thủ tục → "Hỏi AI" tạo hội thoại mới → tra cứu pháp luật → danh bạ cơ quan (Google Maps link) → Profile (lịch sử) → Feedback 👍 gửi thành công → Responsive mobile (Sidebar ẩn, Bottom Nav hiện).

**Chưa test được qua browser tự động** (giới hạn công cụ, không phải lỗi ứng dụng): upload file thật (không có khả năng file-upload trong bộ công cụ Browser hiện tại — đã verify OCR bằng curl ở Phase 4), ghi âm mic thật (cần cấp quyền micro thủ công).
