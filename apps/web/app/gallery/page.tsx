"use client";

import { useEffect, useState } from "react";
import { AppNav } from "../components/AppNav";
import { useLanguage } from "../components/LanguageProvider";
import { readGuestPhotos, type GuestPhoto } from "../lib/gallery";

function DogPortrait({ breed, color }: { breed: string; color: string }) {
  return (
    <svg viewBox="0 0 180 130" className="h-full w-full" aria-hidden="true">
      <rect width="180" height="130" rx="22" fill="#fff3ef" />
      <ellipse cx="92" cy="112" rx="58" ry="11" fill="#f5c4b3" opacity="0.35" />
      <circle cx="90" cy="62" r="34" fill={color} stroke="#3d1f0d" strokeWidth="3" />
      <ellipse cx="55" cy="62" rx="18" ry="25" fill="#c68553" />
      <ellipse cx="125" cy="62" rx="18" ry="25" fill="#c68553" />
      <circle cx="78" cy="63" r="4" fill="#3d1f0d" />
      <circle cx="102" cy="63" r="4" fill="#3d1f0d" />
      <ellipse cx="90" cy="76" rx="8" ry="6" fill="#3d1f0d" />
      <path d="M80 86c7 7 14 7 21 0" fill="none" stroke="#3d1f0d" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function GalleryPage() {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [active, setActive] = useState<GuestPhoto | null>(null);

  useEffect(() => {
    const sync = () => setPhotos(readGuestPhotos());
    sync();
    window.addEventListener("pet-villa-gallery", sync);
    return () => window.removeEventListener("pet-villa-gallery", sync);
  }, []);

  return (
    <div className="villa-shell paw-bg min-h-screen">
      <AppNav />
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <section className="villa-container">
          <h1 className="page-title">{t({ en: "Happy Guests Gallery", zh: "快乐小客人相册" })}</h1>
          <p className="body-copy mt-1">{t({ en: "Latest approved guest photos from Pet Villa stays.", zh: "寄宿主审核后的最新顾客狗狗照片。" })}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {photos.map((photo) => (
              <button key={photo.id} type="button" onClick={() => setActive(photo)} className="overflow-hidden rounded-[20px] border border-villa-primary-light bg-white p-2 text-left shadow-md transition hover:-translate-y-1 hover:shadow-lg">
                <div className="h-28 overflow-hidden rounded-[16px] bg-villa-primary-bg">
                  {photo.imageUrl ? <img src={photo.imageUrl} alt={photo.petName} className="h-full w-full object-cover" /> : <DogPortrait breed={photo.breed} color={photo.color} />}
                </div>
                <strong className="mt-2 block text-sm text-villa-text-primary">{photo.petName}</strong>
                <span className="text-xs font-bold text-villa-text-secondary">{photo.breed}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {active ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-villa-text-primary/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="section-title">{active.petName}</h2>
                <p className="muted-copy m-0">{active.breed}</p>
              </div>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-villa-primary-light font-black" onClick={() => setActive(null)}>×</button>
            </div>
            <div className="mt-4 h-[360px] overflow-hidden rounded-[22px] bg-villa-primary-bg">
              {active.imageUrl ? <img src={active.imageUrl} alt={active.petName} className="h-full w-full object-cover" /> : <DogPortrait breed={active.breed} color={active.color} />}
            </div>
            <p className="body-copy mt-3">{active.caption}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
