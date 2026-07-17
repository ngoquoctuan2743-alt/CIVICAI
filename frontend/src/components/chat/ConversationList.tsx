import Link from 'next/link';
import { Mic, MessageSquare } from 'lucide-react';
import type { Conversation } from '../../types/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Danh sách hội thoại (lịch sử) — NHIỆM VỤ 9 dùng lại ở Profile */
export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/chat/${c.id}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {c.channel === 'VOICE' ? <Mic size={16} /> : <MessageSquare size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{c.title || 'Hội thoại mới'}</p>
              <p className="text-xs text-slate-400">{formatDate(c.updatedAt)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
