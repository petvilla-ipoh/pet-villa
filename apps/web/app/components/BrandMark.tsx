type Props = {
  dark?: boolean;
  host?: boolean;
};

export function BrandMark({ dark = false, host = false }: Props) {
  return (
    <a href="/" className="flex items-center gap-3">
      <div className={`grid h-12 w-12 place-items-center rounded-[18px] border ${dark ? "border-villa-peach/30 bg-villa-peach/10" : "border-villa-line bg-white/80"}`}>
        <span className="font-title text-xl font-black">PV</span>
      </div>
      <div className="grid leading-none">
        <span className={`font-title text-2xl font-black ${dark ? "text-villa-peach" : "text-villa-text"}`}>The Pet Villa</span>
        <span className={`text-[11px] font-black uppercase tracking-wide ${dark ? "text-villa-peach/70" : "text-villa-text/55"}`}>
          {host ? "Host Panel" : "Ipoh · Pet Boarding"}
        </span>
      </div>
    </a>
  );
}
