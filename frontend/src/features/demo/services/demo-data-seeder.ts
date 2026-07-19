import { conversationService } from '../../../services/conversation.service';

/**
 * DemoDataSeeder — dọn dữ liệu demo trước mỗi lần chạy (reset), và sinh nội
 * dung tài liệu demo LUÔN DUY NHẤT mỗi lần chạy. Backend chặn upload trùng
 * nội dung theo file hash (assertNotDuplicate) — nếu tái dùng đúng 1 file
 * PDF mẫu, lần chạy demo thứ 2 sẽ bị 409 Conflict. Nhúng timestamp vào nội
 * dung là cách đơn giản nhất để luôn có hash khác nhau, không cần thêm
 * endpoint xoá tài liệu ở backend (chưa tồn tại).
 */

/** Xoá toàn bộ hội thoại thuộc về userId (tài khoản admin_demo) — an toàn vì chỉ động tới dữ liệu do chính tài khoản demo tạo ra */
export async function resetDemoConversations(): Promise<void> {
  const { items } = await conversationService.findMine({ page: 1, limit: 100 });
  await Promise.allSettled(items.map((c) => conversationService.remove(c.id)));
}

/** Sinh buffer .txt tối giản, hợp lệ, nội dung khác nhau mỗi lần gọi (dùng làm "ThongTuMoi.txt" demo upload) */
export function generateDemoDocumentContent(): { fileName: string; content: string } {
  const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const content = [
    `Thông tư hướng dẫn demo VAIC — mã phiên bản ${marker}`,
    '',
    'Điều 1. Phạm vi điều chỉnh',
    'Thông tư này hướng dẫn trình tự, thủ tục cấp Căn cước công dân trong trường hợp bị mất, hư hỏng.',
    '',
    'Điều 2. Hồ sơ đề nghị cấp lại',
    '1. Tờ khai đề nghị cấp Căn cước công dân.',
    '2. Giấy tờ chứng minh nơi cư trú hợp pháp (nếu có thay đổi).',
    '',
    'Điều 3. Thời hạn giải quyết',
    'Không quá 07 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ.',
  ].join('\n');
  return { fileName: `ThongTuMoi-demo-${marker}.txt`, content };
}
