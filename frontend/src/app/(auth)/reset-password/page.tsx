'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { ApiClientError } from '../../../lib/api-error';
import { authService } from '../../../services/auth.service';
import { useToast } from '../../../stores/toast-context';

function ResetPasswordForm() {
  const router = useRouter();
  const { show } = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (error) {
      show(error instanceof ApiClientError ? error.message : 'Token không hợp lệ hoặc đã hết hạn.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center animate-fade-in">
        <CheckCircle2 size={40} className="text-emerald-600" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-slate-900">Đặt lại mật khẩu thành công</h1>
        <p className="text-sm text-slate-500">Đang chuyển tới trang đăng nhập...</p>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-slate-500">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã thiếu token.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Yêu cầu lại
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Đặt lại mật khẩu</h1>
      <p className="mb-6 text-sm text-slate-500">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Mật khẩu mới"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Đặt lại mật khẩu
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft size={16} /> Quay lại đăng nhập
      </Link>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
