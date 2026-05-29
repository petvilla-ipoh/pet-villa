"use client";

import { useState } from "react";

type Props = {
  dark?: boolean;
  host?: boolean;
};

export function BrandMark({ dark = false, host = false }: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <a href="/" className="flex min-w-0 items-center gap-3">
      {!imageFailed ? (
        <img
          src="/logo.png"
          height={48}
          width={48}
          alt="The Pet Villa"
          className="h-12 w-12 rounded-[14px] object-contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className={`inline-flex h-12 items-center rounded-[14px] border px-3 font-title text-base font-black ${
            dark ? "border-villa-primary-light/30 bg-villa-primary-light/10 text-villa-primary-light" : "border-villa-primary-light bg-white text-villa-text-primary"
          }`}
        >
          The Pet Villa
        </span>
      )}
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
