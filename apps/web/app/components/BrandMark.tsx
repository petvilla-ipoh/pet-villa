"use client";

import Image from "next/image";
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
        <Image
          src="/logo.png"
          alt="The Pet Villa"
          width={48}
          height={48}
          className="h-12 w-12 rounded-[14px] object-contain"
          onError={() => setImageFailed(true)}
          priority
        />
      ) : (
        <div className={`grid h-12 w-12 place-items-center rounded-[14px] border ${dark ? "border-villa-primary-light/30 bg-villa-primary-light/10" : "border-villa-primary-light bg-white"}`}>
          <span className="font-title text-lg font-black">PV</span>
        </div>
      )}
      <div className="min-w-0 leading-none">
        <span className={`block truncate font-title text-xl font-black sm:text-2xl ${dark ? "text-villa-primary-light" : "text-villa-text-primary"}`}>
          The Pet Villa
        </span>
        <span className={`mt-1 block truncate text-[10px] font-black uppercase tracking-wide ${dark ? "text-villa-primary-light/70" : "text-villa-text-secondary"}`}>
          {host ? "Host Panel" : "Ipoh · Pet Boarding"}
        </span>
      </div>
    </a>
  );
}
