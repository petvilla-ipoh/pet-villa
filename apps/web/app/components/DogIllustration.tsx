export function DogIllustration({ label = "Loved and protected" }: { label?: string }) {
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[24px] border border-villa-primary-light bg-villa-surface p-4 shadow-lg">
      <span className="paw-mark right-4 top-4" />
      <div className="absolute right-4 top-4 rounded-pill bg-villa-accent-green px-3 py-2 text-xs font-bold text-white">{label}</div>
      <div className="absolute left-1/2 top-16 h-44 w-44 -translate-x-1/2 rounded-[46%] bg-[#fff7ec] shadow-md">
        <div className="absolute -left-8 top-8 h-20 w-14 -rotate-12 rounded-full bg-[#b87854]" />
        <div className="absolute -right-8 top-8 h-20 w-14 rotate-12 rounded-full bg-[#b87854]" />
        <div className="absolute left-12 top-20 h-3.5 w-3.5 rounded-full bg-villa-text-primary" />
        <div className="absolute right-12 top-20 h-3.5 w-3.5 rounded-full bg-villa-text-primary" />
        <div className="absolute left-1/2 top-28 h-5 w-8 -translate-x-1/2 rounded-full bg-villa-text-primary" />
        <div className="absolute left-1/2 top-36 h-7 w-14 -translate-x-1/2 rounded-b-full border-b-4 border-villa-text-primary" />
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-[18px] bg-villa-accent-green p-4 text-center text-sm font-bold text-white">
        No cages · 24h companionship
      </div>
    </div>
  );
}
