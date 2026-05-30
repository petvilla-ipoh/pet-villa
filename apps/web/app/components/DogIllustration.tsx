export function DogIllustration({ label = "Loved and protected" }: { label?: string }) {
  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-[24px] border border-villa-primary-light bg-[#fff7ec] p-4 shadow-lg sm:min-h-[320px]">
      <span className="paw-mark right-4 top-4" />
      <div className="absolute right-4 top-4 z-10 rounded-pill bg-villa-accent-green px-3 py-2 text-xs font-bold text-white">{label}</div>
      <div className="absolute inset-x-8 top-10 h-32 rounded-[36px] bg-[linear-gradient(180deg,#f7cfc3,#fff7ec)] sm:inset-x-10 sm:h-40" />
      <div className="absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-[46%] bg-white shadow-md sm:top-20 sm:h-48 sm:w-48">
        <div className="absolute -left-8 top-8 h-20 w-14 -rotate-12 rounded-full bg-[#b87854]" />
        <div className="absolute -right-8 top-8 h-20 w-14 rotate-12 rounded-full bg-[#b87854]" />
        <div className="absolute left-11 top-20 h-3.5 w-3.5 rounded-full bg-villa-text-primary sm:left-14 sm:top-24" />
        <div className="absolute right-11 top-20 h-3.5 w-3.5 rounded-full bg-villa-text-primary sm:right-14 sm:top-24" />
        <div className="absolute left-1/2 top-28 h-5 w-8 -translate-x-1/2 rounded-full bg-villa-text-primary sm:top-32" />
        <div className="absolute left-1/2 top-36 h-7 w-14 -translate-x-1/2 rounded-b-full border-b-4 border-villa-text-primary sm:top-40" />
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-[18px] bg-villa-accent-green p-4 text-center text-sm font-bold text-white">
        No cages · 24h companionship
      </div>
    </div>
  );
}
