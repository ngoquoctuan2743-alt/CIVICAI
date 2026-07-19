/**
 * Hiển thị 1 phần của chuỗi TEXT THẬT đã có sẵn (không phải streaming từ
 * server — backend trả nguyên câu 1 lời, đây chỉ là animation phía client).
 * Component THUẦN — không tự chạy timer; nơi gọi (DemoStep) là nguồn thời
 * gian duy nhất, tăng dần `revealedWordCount` qua nhiều lần setStepData để
 * test được (mock thời gian) mà không phụ thuộc component đã mount.
 */
export function TypewriterText({ text, revealedWordCount }: { text: string; revealedWordCount: number }) {
  const words = text.split(' ');
  const shown = Math.min(revealedWordCount, words.length);
  return (
    <span>
      {words.slice(0, shown).join(' ')}
      {shown < words.length && <span className="animate-pulse">▍</span>}
    </span>
  );
}
