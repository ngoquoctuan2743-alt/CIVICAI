'use client';

import { useEffect } from 'react';

/**
 * Đăng ký global keydown listener cho 1 tập phím (vd. ['F9','F10','F11']).
 * Dùng cho Demo Mode (F9/F10/F11 vào demo, ESC thoát) nhưng viết chung chung
 * để tái dùng cho shortcut khác sau này. Bỏ qua khi đang gõ trong input/
 * textarea/contentEditable — tránh chặn nhầm phím tắt trình duyệt lúc nhập liệu.
 */
export function useHotkey(keys: string[], handler: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const keySet = new Set(keys.map((k) => k.toLowerCase()));

    function onKeyDown(e: KeyboardEvent) {
      if (!keySet.has(e.key.toLowerCase())) return;
      const target = e.target as HTMLElement | null;
      const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isEditable) return;
      e.preventDefault();
      handler();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keys, handler, enabled]);
}
