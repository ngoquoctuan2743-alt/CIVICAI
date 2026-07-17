import { Building2, MessageSquare, Scale, User, FileText } from 'lucide-react';

/** Danh sách điều hướng dùng chung cho Sidebar + MobileNav */
export const NAV_ITEMS = [
  { href: '/chat', label: 'Trò chuyện AI', icon: MessageSquare },
  { href: '/procedures', label: 'Thủ tục hành chính', icon: FileText },
  { href: '/legal', label: 'Tra cứu pháp luật', icon: Scale },
  { href: '/agencies', label: 'Cơ quan nhà nước', icon: Building2 },
  { href: '/profile', label: 'Hồ sơ của tôi', icon: User },
] as const;
