'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { ApiClientError } from '../../../lib/api-error';
import { useAuth } from '../../../stores/auth-context';
import { useToast } from '../../../stores/toast-context';

/** Trang đăng ký — validate khớp rule Backend (mật khẩu ≥8 ký tự có chữ+số) */
export default function RegisterPage() {
  const { register } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = 'Vui lòng nhập họ tên';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Email không hợp lệ';
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) {
      next.password = 'Mật khẩu tối thiểu 8 ký tự, có ít nhất 1 chữ và 1 số';
    }
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Mật khẩu nhập lại không khớp';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await register({ email: form.email, password: form.password, fullName: form.fullName });
      show('Tạo tài khoản thành công! Chào mừng bạn đến với VAIC.', 'success');
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Đăng ký thất bại.';
      show(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Tạo tài khoản</h1>
      <p className="mb-6 text-sm text-slate-500">Đăng ký để bắt đầu dùng trợ lý AI công dân.</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Họ và tên"
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          error={errors.fullName}
          required
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
          required
        />
        <Input
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          required
        />
        <Input
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => set('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          required
        />

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          <UserPlus size={16} />
          Đăng ký
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </Card>
  );
}
