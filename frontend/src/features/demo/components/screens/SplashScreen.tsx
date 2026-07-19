/** Step 1 — màn hình mở đầu, thuần trình bày (không gọi API) */
export function SplashScreen() {
  return (
    <div className="flex animate-fade-in flex-col items-center gap-3 text-center">
      <p className="text-6xl font-bold tracking-tight text-white">VAIC</p>
      <p className="text-xl text-slate-300">Vietnamese AI Assistant</p>
      <p className="mt-4 rounded-full border border-blue-800 bg-blue-950/50 px-4 py-1 text-sm font-medium text-blue-300">
        Demo Mode
      </p>
      <div className="mt-8 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce-dot rounded-full bg-blue-500"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
