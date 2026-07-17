'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '../../lib/cn';
import { conversationService } from '../../services/conversation.service';
import { useToast } from '../../stores/toast-context';

/** Đánh giá câu trả lời AI 👍/👎 (NHIỆM VỤ 10) */
export function FeedbackButtons({ conversationId, messageId }: { conversationId: string; messageId: string }) {
  const { show } = useToast();
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(value: 1 | -1) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const previous = rating;
    setRating(value); // optimistic update
    try {
      await conversationService.submitFeedback(conversationId, messageId, value);
      show(value === 1 ? 'Cảm ơn phản hồi của bạn!' : 'Đã ghi nhận, chúng tôi sẽ cải thiện.', 'success');
    } catch {
      setRating(previous);
      show('Không gửi được đánh giá, vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-1" role="group" aria-label="Đánh giá câu trả lời">
      <button
        onClick={() => void submit(1)}
        aria-pressed={rating === 1}
        aria-label="Hữu ích"
        title="Hữu ích"
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
          rating === 1 ? 'text-emerald-600' : 'text-slate-400',
        )}
      >
        <ThumbsUp size={15} fill={rating === 1 ? 'currentColor' : 'none'} />
      </button>
      <button
        onClick={() => void submit(-1)}
        aria-pressed={rating === -1}
        aria-label="Chưa chính xác"
        title="Chưa chính xác"
        className={cn(
          'rounded-lg p-1.5 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
          rating === -1 ? 'text-red-600' : 'text-slate-400',
        )}
      >
        <ThumbsDown size={15} fill={rating === -1 ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
