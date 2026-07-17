'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';

/**
 * Quên mật khẩu — PLACEHOLDER theo đúng yêu cầu (NHIỆM VỤ 2, Phase 5).
 * Backend chưa có endpoint reset password (ngoài phạm vi Phase 4 đã đóng băng).
 */
export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center animate-fade-in">
        <MailCheck size={40} className="text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-slate-900">Tính năng đang được phát triển</h1>
        <p className="text-sm text-slate-500">
          Khôi phục mật khẩu qua email sẽ sớm ra mắt. Hiện tại vui lòng liên hệ quản trị viên nếu
          bạn quên mật khẩu.
        </p>
        <Link href="/login" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} /> Quay lại đăng nhập
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Quên mật khẩu</h1>
      <p className="mb-6 text-sm text-slate-500">
        Nhập email đã đăng ký — chúng tôi sẽ gửi hướng dẫn khôi phục (tính năng sắp ra mắt).
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Email" type="email" required placeholder="ban@vidu.com" />
        <Button type="submit" className="w-full">
          Gửi yêu cầu
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft size={16} /> Quay lại đăng nhập
      </Link>
    </Card>
  );
}
