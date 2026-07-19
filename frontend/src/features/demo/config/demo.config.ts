/**
 * DemoConfiguration — toàn bộ tham số Demo Mode đọc từ NEXT_PUBLIC_DEMO_*,
 * cùng quy ước với API_BASE_URL ở lib/constants.ts (?? fallback, không dùng
 * schema lib). Tài khoản admin_demo không phải secret thật — mật khẩu demo
 * dùng chung đã nằm sẵn trong source code migration (DEMO_PASSWORD), nên để
 * public env var ở đây là nhất quán, không phải rò rỉ thông tin mới.
 */

export const DEMO_HOTKEYS = ['F9', 'F10', 'F11'];
export const DEMO_EXIT_KEY = 'Escape';

export const DEMO_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? 'admin_demo@vaic.gov.vn';
export const DEMO_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? 'Demo@2026';

/** Tốc độ hiệu ứng gõ chữ (ms/từ) khi mô phỏng câu hỏi công dân */
export const DEMO_TYPING_SPEED_MS = Number(process.env.NEXT_PUBLIC_DEMO_TYPING_SPEED_MS ?? 60);
/** Tốc độ chuyển cảnh chung giữa các bước (ms) */
export const DEMO_STEP_TRANSITION_MS = Number(process.env.NEXT_PUBLIC_DEMO_STEP_TRANSITION_MS ?? 900);
/** Thời gian dừng ở mỗi mắt xích trong sơ đồ AI Workflow (ms) — trình bày trực quan, không phải đo thật */
export const DEMO_WORKFLOW_STAGE_MS = Number(process.env.NEXT_PUBLIC_DEMO_WORKFLOW_STAGE_MS ?? 700);
/** Chu kỳ poll trạng thái job chunk/embedding khi upload tài liệu (ms) */
export const DEMO_JOB_POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_DEMO_JOB_POLL_INTERVAL_MS ?? 1500);
/** Số lần poll tối đa trước khi hiển thị "vẫn đang xử lý" thay vì giả vờ xong */
export const DEMO_JOB_POLL_MAX_ATTEMPTS = Number(process.env.NEXT_PUBLIC_DEMO_JOB_POLL_MAX_ATTEMPTS ?? 30);

/** Câu hỏi kịch bản — cấu hình được, không hardcode sâu trong component */
export const DEMO_QUESTION_1 = process.env.NEXT_PUBLIC_DEMO_QUESTION_1 ?? 'Tôi muốn làm Căn cước công dân lần đầu.';
export const DEMO_QUESTION_2 = process.env.NEXT_PUBLIC_DEMO_QUESTION_2 ?? 'Tôi bị mất Căn cước công dân thì cần làm gì?';
