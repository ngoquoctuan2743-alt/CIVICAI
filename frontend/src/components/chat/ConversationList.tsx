'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Mic, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import type { Conversation } from '../../types/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface ConversationListProps {
  conversations: Conversation[];
  onRename?: (id: string, title: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

/** Danh sách hội thoại (lịch sử) — có thể đổi tên/xóa nếu truyền callback (Chat list, Profile) */
export function ConversationList({ conversations, onRename, onDelete }: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(c: Conversation) {
    setEditingId(c.id);
    setEditValue(c.title ?? '');
  }

  async function confirmEdit(id: string) {
    const title = editValue.trim();
    if (title && onRename) await onRename(id, title);
    setEditingId(null);
  }

  return (
    <ul className="flex flex-col gap-2">
      {conversations.map((c) => (
        <li
          key={c.id}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {c.channel === 'VOICE' ? <Mic size={16} /> : <MessageSquare size={16} />}
          </span>

          {editingId === c.id ? (
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void confirmEdit(c.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30"
              />
              <button
                onClick={() => void confirmEdit(c.id)}
                aria-label="Lưu tên"
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setEditingId(null)}
                aria-label="Hủy"
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <Link href={`/chat/${c.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{c.title || 'Hội thoại mới'}</p>
              <p className="text-xs text-slate-400">{formatDate(c.updatedAt)}</p>
            </Link>
          )}

          {editingId !== c.id && (onRename || onDelete) && (
            <div className="flex shrink-0 gap-1">
              {onRename && (
                <button
                  onClick={() => startEdit(c)}
                  aria-label="Đổi tên hội thoại"
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <Pencil size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => void onDelete(c.id)}
                  aria-label="Xóa hội thoại"
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
