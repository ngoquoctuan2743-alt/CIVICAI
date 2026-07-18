'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Clock, FileText, MessageCircleQuestion, Scale, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { conversationService } from '../../../../services/conversation.service';
import { proceduresService } from '../../../../services/procedures.service';
import { useToast } from '../../../../stores/toast-context';
import type { AdministrativeProcedure } from '../../../../types/api';

/** Chi tiết thủ tục: các bước, giấy tờ, thời gian, cơ quan + nút "Hỏi AI" (NHIỆM VỤ 6) */
export default function ProcedureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [procedure, setProcedure] = useState<AdministrativeProcedure | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    proceduresService
      .findOne(id)
      .then(setProcedure)
      .catch(() => show('Không tải được thủ tục.', 'error'));
  }, [id, show]);

  async function handleAskAi() {
    if (!procedure) return;
    setIsAsking(true);
    try {
      const conv = await conversationService.create('CHAT', procedure.name);
      await conversationService.sendMessage(conv.id, `Hướng dẫn tôi chi tiết về thủ tục "${procedure.name}"`);
      router.push(`/chat/${conv.id}`);
    } catch {
      show('Không tạo được hội thoại với AI.', 'error');
      setIsAsking(false);
    }
  }

  if (!procedure) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-2/3" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link href="/procedures" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft size={15} /> Quay lại danh sách
      </Link>

      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{procedure.name}</h1>
        <div className="mt-1 flex shrink-0 gap-1.5">
          {procedure.category && <Badge tone="gray">{procedure.category}</Badge>}
          <Badge tone="blue">{procedure.code}</Badge>
        </div>
      </div>
      <div className="mb-5">
        {procedure.description && <p className="text-sm text-slate-600">{procedure.description}</p>}
        {procedure.expectedResult && (
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Kết quả thực hiện: </span>
            {procedure.expectedResult}
          </p>
        )}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoTile icon={Building2} label="Cơ quan xử lý" value={procedure.agency?.name ?? '—'} />
        <InfoTile icon={Clock} label="Thời gian xử lý" value={procedure.processingTimeText ?? '—'} />
        <InfoTile icon={Wallet} label="Lệ phí" value={procedure.feeText ?? '—'} />
      </div>

      {procedure.requirements && procedure.requirements.length > 0 && (
        <Card className="mb-5 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-800">
            <FileText size={16} className="text-primary" /> Giấy tờ cần chuẩn bị
          </h2>
          <ul className="flex flex-col gap-2">
            {procedure.requirements.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                <span>
                  {r.name}
                  {r.quantity > 1 && <span className="text-slate-400"> ({r.quantity} bản)</span>}
                  {r.note && <span className="block text-xs text-slate-400">{r.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {procedure.steps && procedure.steps.length > 0 && (
        <Card className="mb-5 p-4">
          <h2 className="mb-3 font-medium text-slate-800">Các bước thực hiện</h2>
          <ol className="flex flex-col gap-4">
            {procedure.steps.map((s) => (
              <li key={s.id} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  {s.stepNumber}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{s.title}</p>
                  {s.description && <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {procedure.legalBasisText && (
        <Card className="mb-5 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-medium text-slate-800">
            <Scale size={16} className="text-primary" /> Căn cứ pháp lý
          </h2>
          <p className="text-sm text-slate-600">{procedure.legalBasisText}</p>
        </Card>
      )}

      <Button onClick={handleAskAi} isLoading={isAsking} className="w-full sm:w-auto">
        <MessageCircleQuestion size={16} />
        Hỏi AI về thủ tục này
      </Button>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
        <Icon size={13} /> {label}
      </p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}
