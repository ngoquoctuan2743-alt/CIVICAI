'use client';

import { useEffect, useState } from 'react';
import { FileImage, LogOut, MessagesSquare, ShieldCheck, User } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { CardListSkeleton, Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConversationList } from '../../../components/chat/ConversationList';
import { conversationService } from '../../../services/conversation.service';
import { documentsService } from '../../../services/documents.service';
import { useAuth } from '../../../stores/auth-context';
import type { Conversation, DocumentRecord } from '../../../types/api';

const OCR_STATUS_TONE: Record<string, 'green' | 'red' | 'amber' | 'gray'> = {
  COMPLETED: 'green',
  FAILED: 'red',
  PROCESSING: 'amber',
  PENDING: 'amber',
  NONE: 'gray',
};

/** Hồ sơ người dùng: thông tin, lịch sử hội thoại, lịch sử OCR, đăng xuất (NHIỆM VỤ 9) */
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null);
  const [tab, setTab] = useState<'chat' | 'ocr'>('chat');

  useEffect(() => {
    conversationService.findMine(1, 10).then((r) => setConversations(r.items)).catch(() => setConversations([]));
    documentsService.findMine().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Card className="mb-6 flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{user?.fullName}</p>
          <p className="truncate text-sm text-slate-500">{user?.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600" />
            {user?.roles.map((r) => (
              <Badge key={r} tone="green">{r === 'CITIZEN' ? 'Công dân' : r}</Badge>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')} icon={MessagesSquare} label="Lịch sử hội thoại" />
        <TabButton active={tab === 'ocr'} onClick={() => setTab('ocr')} icon={FileImage} label="Lịch sử OCR" />
      </div>

      {tab === 'chat' &&
        (conversations === null ? (
          <CardListSkeleton count={3} />
        ) : conversations.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="Chưa có hội thoại nào" />
        ) : (
          <ConversationList conversations={conversations} />
        ))}

      {tab === 'ocr' &&
        (documents === null ? (
          <CardListSkeleton count={3} />
        ) : documents.length === 0 ? (
          <EmptyState icon={FileImage} title="Chưa có giấy tờ nào được quét" description="Tải ảnh giấy tờ trong khung chat để dùng OCR." />
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{doc.fileName}</p>
                  <p className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <Badge tone={OCR_STATUS_TONE[doc.ocrStatus] ?? 'gray'}>{doc.ocrStatus}</Badge>
              </Card>
            ))}
          </div>
        ))}

      <div className="mt-8 border-t border-slate-200 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Cài đặt</h2>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Ngôn ngữ</p>
              <p className="text-xs text-slate-400">Tiếng Việt (mặc định)</p>
            </div>
          </div>
        </Card>
        <Button variant="danger" onClick={() => void logout()} className="mt-4 w-full">
          <LogOut size={16} /> Đăng xuất
        </Button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors sm:text-sm ${
        active ? 'bg-white text-primary shadow-sm' : 'text-slate-500'
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
