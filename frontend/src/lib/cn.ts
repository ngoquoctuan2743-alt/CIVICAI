import { clsx, type ClassValue } from 'clsx';

/** Ghép className có điều kiện — dùng khắp components/ui */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
