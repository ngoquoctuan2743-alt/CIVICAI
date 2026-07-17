'use client';

import { useEffect, useState } from 'react';

/** Debounce giá trị (dùng cho ô tìm kiếm — tránh gọi API mỗi phím gõ) */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
