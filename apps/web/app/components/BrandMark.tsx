"use client";

type Props = {
  dark?: boolean;
  host?: boolean;
};

export function BrandMark({ dark = false, host = false }: Props) {
  return (
    <a href="/" className="flex min-w-0 items-center gap-3">
      <img
        src="/petvilla-app-badge.webp"
        alt="The Pet Villa"
        className="h-14 w-14 rounded-[18px] border border-white/90 object-cover shadow-[inset_0_-6px_12px_rgba(183,142,255,0.10),0_10px_18px_rgba(61,31,13,0.10)]"
        onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <div className="min-w-0 leading-none">
        <span className={`block truncate font-title text-xl font-black ${dark ? "text-villa-primary-light" : "text-villa-text-primary"}`}>
          The Pet Villa
        </span>
        <span className={`mt-1 block truncate text-[10px] font-black uppercase tracking-wide ${dark ? "text-villa-primary-light/70" : "text-villa-text-secondary"}`}>
          {host ? "Host Panel" : "Ipoh · Pet Boarding"}
        </span>
      </div>
    </a>
  );
}
