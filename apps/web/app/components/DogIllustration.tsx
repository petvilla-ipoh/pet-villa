export function DogIllustration({ label = "Loved and protected" }: { label?: string }) {
  return (
    <div className="paw-bg relative min-h-[330px] overflow-hidden rounded-[32px] border border-villa-line bg-gradient-to-b from-villa-peach/60 to-villa-cream p-6 shadow-villa">
      <div className="absolute right-6 top-6 rounded-pill bg-villa-green px-4 py-2 text-xs font-black text-white">{label}</div>
      <div className="absolute left-1/2 top-16 h-48 w-48 -translate-x-1/2 rounded-[46%] bg-white shadow-soft">
        <div className="absolute -left-10 top-8 h-24 w-16 -rotate-12 rounded-full bg-[#b87854]" />
        <div className="absolute -right-10 top-8 h-24 w-16 rotate-12 rounded-full bg-[#b87854]" />
        <div className="absolute left-14 top-20 h-4 w-4 rounded-full bg-villa-text" />
        <div className="absolute right-14 top-20 h-4 w-4 rounded-full bg-villa-text" />
        <div className="absolute left-1/2 top-28 h-5 w-8 -translate-x-1/2 rounded-full bg-villa-text" />
        <div className="absolute left-1/2 top-36 h-8 w-16 -translate-x-1/2 rounded-b-full border-b-4 border-villa-text" />
      </div>
      <div className="absolute inset-x-6 bottom-6 rounded-[24px] bg-villa-green p-5 text-center text-lg font-black text-white">
        No cages · 24h companionship
      </div>
    </div>
  );
}
