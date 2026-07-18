'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CardListSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ConversationList } from '../../../components/chat/ConversationList';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { ApiClientError } from '../../../lib/api-error';
import { PENDING_QUESTION_KEY } from '../../../lib/constants';
import { conversationService } from '../../../services/conversation.service';
import { useToast } from '../../../stores/toast-context';
import type { Conversation } from '../../../types/api';

/** Danh sách hội thoại (Lịch sử) — tạo mới, tìm kiếm, đổi tên, xóa */
export default function ChatListPage() {
  const router = useRouter();
  const { show } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSendingPendingQuestion, setIsSendingPendingQuestion] = useState(false);

  function reload() {
    conversationService
      .findMine({ search: debouncedSearch, limit: 50 })
      .then((res) => setConversations(res.items))
      .catch(() => show('Không tải được lịch sử hội thoại.', 'error'));
  }

  // Câu hỏi đã gõ ở trang chủ trước khi đăng nhập -> gửi tự động ngay khi vào /chat
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_QUESTION_KEY);
    if (!pending) return;
    localStorage.removeItem(PENDING_QUESTION_KEY);
    setIsSendingPendingQuestion(true);
    (async () => {
      try {
        const conv = await conversationService.create('CHAT', pending);
        await conversationService.sendMessage(conv.id, pending);
        router.push(`/chat/${conv.id}`);
      } catch {
        show('Không gửi được câu hỏi vừa nhập, vui lòng thử lại.', 'error');
        setIsSendingPendingQuestion(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy 1 lần khi mount
  }, []);

  useEffect(() => {
    setConversations(null);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload chỉ phụ thuộc debouncedSearch
  }, [debouncedSearch]);

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

  async function handleRename(id: string, title: string) {
    try {
      await conversationService.rename(id, title);
      show('Đã đổi tên hội thoại', 'success');
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Không đổi được tên hội thoại.', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await conversationService.remove(id);
      show('Đã xóa hội thoại', 'success');
      reload();
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Không xóa được hội thoại.', 'error');
    }
  }

  if (isSendingPendingQuestion) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <MessageSquarePlus size={28} className="animate-pulse text-primary" />
        <p className="text-sm text-slate-500">Đang gửi câu hỏi của bạn tới VAIC...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Trò chuyện với VAIC</h1>
          <p className="text-sm text-slate-500">Hỏi về thủ tục, pháp luật, cơ quan nhà nước...</p>
        </div>
        <Button onClick={handleCreate} isLoading={isCreating}>
          <MessageSquarePlus size={16} />
          <span className="hidden sm:inline">Hội thoại mới</span>
        </Button>
      </div>

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Tìm hội thoại theo tiêu đề..." />
      </div>

      {conversations === null ? (
        <CardListSkeleton />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={search ? 'Không tìm thấy hội thoại phù hợp' : 'Chưa có hội thoại nào'}
          description={search ? 'Thử từ khóa khác.' : 'Bắt đầu trò chuyện để được VAIC hỗ trợ về dịch vụ công.'}
          action={
            !search && (
              <Button onClick={handleCreate} isLoading={isCreating} size="sm">
                Bắt đầu ngay
              </Button>
            )
          }
        />
      ) : (
        <ConversationList conversations={conversations} onRename={handleRename} onDelete={handleDelete} />
      )}
    </div>
  );
}
