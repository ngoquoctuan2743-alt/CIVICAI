import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS — Modern / Minimal / Government Style.
 * Màu chủ đạo: Xanh dương (tin cậy) + Trắng + Xám nhạt.
 * Hiệu ứng nhẹ: fade, slide — KHÔNG dùng animation nặng.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1d4ed8',
          dark: '#1e3a8a',
          light: '#3b82f6',
        },
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        bounceDot: { '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.5' }, '40%': { transform: 'scale(1)', opacity: '1' } },
        wave: { '0%, 100%': { transform: 'scaleY(0.3)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'bounce-dot': 'bounceDot 1.2s ease-in-out infinite',
        wave: 'wave 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
