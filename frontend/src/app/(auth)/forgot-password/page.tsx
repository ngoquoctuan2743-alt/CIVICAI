'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { ApiClientError } from '../../../lib/api-error';
import { authService } from '../../../services/auth.service';
import { useToast } from '../../../stores/toast-context';

/**
 * Quên mật khẩu — nối API thật (Backend Prompt 18). Ở môi trường non-production,
 * API trả kèm devToken để tự kiểm thử luồng đặt lại mật khẩu khi chưa có email thật.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await authService.forgotPassword(email);
      setSubmitted(true);
      if (result.devToken) {
        // Môi trường demo/dev — chuyển thẳng sang trang đặt lại kèm token (chưa có email thật)
        router.push(`/reset-password?token=${encodeURIComponent(result.devToken)}`);
      }
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Không gửi được yêu cầu.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center animate-fade-in">
        <MailCheck size={40} className="text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-slate-900">Đã gửi yêu cầu</h1>
        <p className="text-sm text-slate-500">
          Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.
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
      <p className="mb-6 text-sm text-slate-500">Nhập email đã đăng ký — chúng tôi sẽ gửi hướng dẫn khôi phục.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          required
          placeholder="ban@vidu.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Gửi yêu cầu
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft size={16} /> Quay lại đăng nhập
      </Link>
    </Card>
  );
}
