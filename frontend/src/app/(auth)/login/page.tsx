'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { ApiClientError } from '../../../lib/api-error';
import { useAuth } from '../../../stores/auth-context';
import { useToast } from '../../../stores/toast-context';

/** Trang đăng nhập — JWT qua AuthContext, validate cơ bản, có loading */
export default function LoginPage() {
  const { login } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Email không hợp lệ';
    if (!password) next.password = 'Vui lòng nhập mật khẩu';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await login({ email, password });
      show('Đăng nhập thành công!', 'success');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Đăng nhập thất bại.';
      show(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Đăng nhập</h1>
      <p className="mb-6 text-sm text-slate-500">Đăng nhập để sử dụng trợ lý AI dịch vụ công.</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Input
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          <LogIn size={16} />
          Đăng nhập
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </Card>
  );
}
