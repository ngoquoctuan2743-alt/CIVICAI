'use client';

import { useEffect, useState } from 'react';
import { Building2, MessageSquare, Scale, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { adminService } from '../../../services/admin.service';
import type { DashboardSummary } from '../../../types/api';

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} aria-hidden="true" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value.toLocaleString('vi-VN')}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

/** Tổng quan số liệu hệ thống (ADMIN) */
export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    adminService.getDashboard().then(setSummary);
  }, []);

  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard icon={Users} label="Người dùng" value={summary.users.total} hint={`${summary.users.active} đang hoạt động`} />
      <StatCard
        icon={MessageSquare}
        label="Hội thoại"
        value={summary.conversations.total}
        hint={`${summary.conversations.active} đang mở`}
      />
      <StatCard
        icon={Scale}
        label="Thủ tục hành chính"
        value={summary.procedures.total}
        hint={`${summary.procedures.active} đang công khai`}
      />
      <StatCard icon={Building2} label="Cơ quan nhà nước" value={summary.agencies.total} />
      <StatCard
        icon={Scale}
        label="Văn bản pháp luật"
        value={summary.legalDocuments.total}
        hint={`${summary.legalDocuments.effective} còn hiệu lực`}
      />
      <Card className="p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <ThumbsUp size={16} aria-hidden="true" />
          <span className="text-sm font-medium">Phản hồi người dùng</span>
        </div>
        <p className="mt-2 flex items-center gap-3 text-2xl font-semibold text-slate-900">
          <span className="flex items-center gap-1 text-emerald-600">
            <ThumbsUp size={16} /> {summary.feedback.positive}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <ThumbsDown size={16} /> {summary.feedback.negative}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">{summary.feedback.total} lượt đánh giá</p>
      </Card>
    </div>
  );
}
