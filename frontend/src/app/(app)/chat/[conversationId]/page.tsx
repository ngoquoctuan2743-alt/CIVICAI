'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Mic } from 'lucide-react';
import Link from 'next/link';
import { ChatBubble } from '../../../../components/chat/ChatBubble';
import { ChatInput } from '../../../../components/chat/ChatInput';
import { TypingIndicator } from '../../../../components/chat/TypingIndicator';
import { OcrResultCard } from '../../../../components/ocr/OcrResultCard';
import { Spinner } from '../../../../components/ui/Spinner';
import { useTextToSpeech } from '../../../../hooks/use-text-to-speech';
import { conversationService } from '../../../../services/conversation.service';
import { documentsService } from '../../../../services/documents.service';
import { useToast } from '../../../../stores/toast-context';
import type { Conversation, Message, OcrAnalyzeResult } from '../../../../types/api';

/** Một mục trên dòng thời gian hội thoại — tin nhắn thật hoặc kết quả OCR (hiển thị tại chỗ) */
type TimelineItem =
  | { kind: 'message'; key: string; message: Message }
  | { kind: 'ocr'; key: string; result: OcrAnalyzeResult };

/** Trang chat chi tiết — tích hợp Chat (NHIỆM VỤ 3) + Voice (4) + OCR (5) trong 1 giao diện */
export default function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { show } = useToast();
  const { speak } = useTextToSpeech();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [messagesRes, conversationsRes] = await Promise.all([
          conversationService.getMessages(conversationId),
          conversationService.findMine(1, 100),
        ]);
        if (cancelled) return;
        setTimeline(messagesRes.items.map((m) => ({ kind: 'message', key: m.id, message: m })));
        setConversation(conversationsRes.items.find((c) => c.id === conversationId) ?? null);
      } catch {
        show('Không tải được hội thoại.', 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, show]);

  // Auto Scroll — luôn cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline, isSending]);

  async function handleSend(text: string) {
    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    setTimeline((prev) => [
      ...prev,
      {
        kind: 'message',
        key: tempId,
        message: {
          id: tempId,
          conversationId,
          senderRole: 'USER',
          content: text,
          contentType: 'TEXT',
          documentId: null,
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      },
    ]);

    try {
      const result = await conversationService.sendMessage(conversationId, text);
      setTimeline((prev) => {
        const withoutTemp = prev.filter((i) => i.key !== tempId);
        const next: TimelineItem[] = [...withoutTemp, { kind: 'message', key: result.userMessage.id, message: result.userMessage }];
        if (result.assistantMessage) {
          next.push({ kind: 'message', key: result.assistantMessage.id, message: result.assistantMessage });
          // Voice: nếu AI đánh dấu speakable, tự đọc to câu trả lời (Text -> TTS -> Frontend Player)
          if (result.assistantMessage.metadata?.speakable) {
            speak(result.assistantMessage.content);
          }
        }
        return next;
      });
      if (result.aiError) {
        show(result.aiError, 'error');
      }
    } catch {
      setTimeline((prev) => prev.filter((i) => i.key !== tempId));
      show('Không gửi được tin nhắn, vui lòng thử lại.', 'error');
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendImage(file: File) {
    setIsUploadingImage(true);
    try {
      const result = await documentsService.analyze(file);
      setTimeline((prev) => [...prev, { kind: 'ocr', key: result.documentId, result }]);
      show('Đã đọc xong giấy tờ!', 'success');
    } catch {
      show('Không xử lý được ảnh. Vui lòng thử ảnh khác hoặc kiểm tra định dạng.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/chat" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden" aria-label="Quay lại danh sách">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{conversation?.title || 'Hội thoại mới'}</p>
        </div>
        {conversation?.channel === 'VOICE' && (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Mic size={12} /> Chế độ giọng nói
          </span>
        )}
      </div>

      <div className="thin-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
            <AlertTriangle size={28} className="opacity-40" />
            <p className="text-sm">Hãy đặt câu hỏi đầu tiên, ví dụ: &quot;Tôi muốn làm CCCD&quot;</p>
          </div>
        ) : (
          timeline.map((item) =>
            item.kind === 'message' ? (
              <ChatBubble key={item.key} message={item.message} conversationId={conversationId} />
            ) : (
              <div key={item.key} className="flex flex-col items-start">
                <OcrResultCard result={item.result} />
              </div>
            ),
          )
        )}
        {isSending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} onSendImage={handleSendImage} disabled={isSending || isUploadingImage} />
    </div>
  );
}
