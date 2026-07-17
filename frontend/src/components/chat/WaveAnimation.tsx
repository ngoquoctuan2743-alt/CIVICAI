/** Wave Animation — hiệu ứng sóng âm khi đang ghi âm (NHIỆM VỤ 4) */
export function WaveAnimation() {
  return (
    <div className="flex h-4 items-center gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-0.5 animate-wave rounded-full bg-red-500"
          style={{ height: '100%', animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
