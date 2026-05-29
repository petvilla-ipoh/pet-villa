"use client";

type Props = {
  dark?: boolean;
  host?: boolean;
};

export function BrandMark({ dark = false, host = false }: Props) {
  return (
    <a href="/" className="flex min-w-0 items-center gap-3">
      <img
        src="/logo.png"
        alt="The Pet Villa"
        style={{ height: "48px" }}
        className="w-auto rounded-[14px] object-contain"
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
