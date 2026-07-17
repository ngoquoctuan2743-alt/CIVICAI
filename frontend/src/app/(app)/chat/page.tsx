'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CardListSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConversationList } from '../../../components/chat/ConversationList';
import { conversationService } from '../../../services/conversation.service';
import { useToast } from '../../../stores/toast-context';
import type { Conversation } from '../../../types/api';

/** Danh sách hội thoại + tạo mới */
export default function ChatListPage() {
  const router = useRouter();
  const { show } = useToast();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    conversationService
      .findMine()
      .then((res) => setConversations(res.items))
      .catch(() => show('Không tải được lịch sử hội thoại.', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tải 1 lần khi mount
  }, []);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const conv = await conversationService.create('CHAT');
      router.push(`/chat/${conv.id}`);
    } catch {
      show('Không tạo được hội thoại mới.', 'error');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Trò chuyện với VAIC</h1>
          <p className="text-sm text-slate-500">Hỏi về thủ tục, pháp luật, cơ quan nhà nước...</p>
        </div>
        <Button onClick={handleCreate} isLoading={isCreating}>
          <MessageSquarePlus size={16} />
          Hội thoại mới
        </Button>
      </div>

      {conversations === null ? (
        <CardListSkeleton />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Chưa có hội thoại nào"
          description="Bắt đầu trò chuyện để được VAIC hỗ trợ về dịch vụ công."
          action={
            <Button onClick={handleCreate} isLoading={isCreating} size="sm">
              Bắt đầu ngay
            </Button>
          }
        />
      ) : (
        <ConversationList conversations={conversations} />
      )}
    </div>
  );
}
