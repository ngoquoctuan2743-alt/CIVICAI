'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, FileText, Mic, ScanLine, Scale, MessageSquare, ArrowRight, Send } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { ProcedureCard } from '../components/procedures/ProcedureCard';
import { Skeleton } from '../components/ui/Skeleton';
import { PENDING_QUESTION_KEY } from '../lib/constants';
import { proceduresService } from '../services/procedures.service';
import { useAuth } from '../stores/auth-context';
import type { AdministrativeProcedure } from '../types/api';

const FEATURES = [
  { icon: MessageSquare, title: 'Chat AI thông minh', desc: 'Hỏi đáp tự nhiên bằng tiếng Việt, trả lời có trích dẫn nguồn rõ ràng.' },
  { icon: Scale, title: 'Tra cứu pháp luật', desc: 'Luật, Nghị định, Thông tư — cập nhật và dễ tìm.' },
  { icon: FileText, title: 'Hướng dẫn thủ tục', desc: 'Từng bước thực hiện, giấy tờ cần chuẩn bị, thời gian xử lý.' },
  { icon: Building2, title: 'Danh bạ cơ quan', desc: 'Địa chỉ, điện thoại, email cơ quan nhà nước gần bạn.' },
  { icon: ScanLine, title: 'Đọc giấy tờ tự động', desc: 'Chụp ảnh CCCD, giấy tờ — AI đọc và phân tích ngay.' },
  { icon: Mic, title: 'Trợ lý giọng nói', desc: 'Nói chuyện trực tiếp với AI, không cần gõ phím.' },
] as const;

/** Landing Page — Logo, giới thiệu, ô hỏi nhanh, thủ tục phổ biến, chức năng chính (NHIỆM VỤ 1) */
export default function LandingPage() {
  const { isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [popularProcedures, setPopularProcedures] = useState<AdministrativeProcedure[] | null>(null);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) router.replace('/chat');
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    proceduresService
      .findAll({ limit: 4 })
      .then((res) => setPopularProcedures(res.items))
      .catch(() => setPopularProcedures([]));
  }, []);

  function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    // Chưa đăng nhập -> lưu câu hỏi, gửi tự động ngay khi vào /chat sau khi đăng ký/đăng nhập
    localStorage.setItem(PENDING_QUESTION_KEY, trimmed);
    router.push('/register');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size="md" />
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary"
        >
          Đăng nhập
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        <section className="animate-fade-in text-center">
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Dự thi AI 2026 — Dịch vụ công thông minh
          </span>
          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Trợ lý AI đồng hành cùng người dân
            <span className="text-primary"> làm thủ tục hành chính</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 sm:text-lg">
            VAIC (Virtual AI Citizen Assistant) giúp bạn hỏi đáp pháp luật, tra cứu thủ tục, tìm cơ
            quan nhà nước và đọc giấy tờ — nhanh chóng, chính xác, có nguồn tham khảo rõ ràng.
          </p>

          <form onSubmit={handleAskQuestion} className="mx-auto mt-8 flex max-w-xl gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='Vd: "Tôi muốn đổi CCCD cần giấy tờ gì?"'
              aria-label="Nhập câu hỏi cho trợ lý AI"
              className="h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30"
            />
            <button
              type="submit"
              disabled={!question.trim()}
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark disabled:opacity-40"
            >
              <Send size={16} /> Hỏi ngay
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/5"
            >
              Đăng ký tài khoản <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Tôi đã có tài khoản
            </Link>
          </div>
        </section>

        {(popularProcedures === null || popularProcedures.length > 0) && (
          <section className="mt-14 sm:mt-20">
            <h2 className="mb-4 text-center text-lg font-semibold text-slate-900">Thủ tục phổ biến</h2>
            {popularProcedures === null ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {popularProcedures.map((p) => (
                  <ProcedureCard key={p.id} procedure={p} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-14 grid grid-cols-1 gap-4 sm:mt-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3 className="mb-1 font-semibold text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        VAIC 2026 — Virtual AI Citizen Assistant · Dự án dự thi AI 2026
      </footer>
    </div>
  );
}
