"use client";

import { useEffect, useState } from "react";
import { AppNav } from "../components/AppNav";
import { useLanguage } from "../components/LanguageProvider";
import { readGuestPhotos, type GuestPhoto } from "../lib/gallery";

export default function GalleryPage() {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setPhotos(readGuestPhotos());
    sync();
    window.addEventListener("pet-villa-gallery", sync);
    return () => window.removeEventListener("pet-villa-gallery", sync);
  }, []);

  function move(direction: 1 | -1) {
    setActiveIndex((index) => {
      if (index === null || photos.length === 0) return index;
      return (index + direction + photos.length) % photos.length;
    });
  }

  const active = activeIndex === null ? null : photos[activeIndex];

  return (
    <div className="villa-shell paw-bg min-h-screen">
      <AppNav />
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <section className="villa-container">
          <h1 className="page-title">{t({ en: "Happy Guests Gallery", zh: "快乐小客人相册" })}</h1>
          <p className="body-copy mt-1">{t({ en: "Approved marketing photos uploaded by the Pet Villa host/admin.", zh: "由 Pet Villa 寄宿主或管理员上传并审核的宣传相册。" })}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {photos.map((photo, index) => (
              <button key={photo.id} type="button" onClick={() => setActiveIndex(index)} className="overflow-hidden rounded-[20px] border border-villa-primary-light bg-white p-2 text-left shadow-md transition hover:-translate-y-1 hover:shadow-lg">
                <div className="h-28 overflow-hidden rounded-[16px] bg-villa-primary-bg">
                  <img src={photo.imageUrl || "/hero-dogs.png"} alt={photo.petName} className="h-full w-full object-cover" />
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
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-villa-primary-light font-black" onClick={() => setActiveIndex(null)}>×</button>
            </div>
            <div
              className="relative mt-4 h-[360px] overflow-hidden rounded-[22px] bg-villa-primary-bg"
              onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
              onTouchEnd={(event) => {
                if (touchStart === null) return;
                const delta = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
                if (Math.abs(delta) >= 35) move(delta < 0 ? 1 : -1);
                setTouchStart(null);
              }}
            >
              <img src={active.imageUrl || "/hero-dogs.png"} alt={active.petName} className="h-full w-full object-cover" />
              <button type="button" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 font-black text-villa-primary shadow-md" onClick={() => move(-1)} aria-label="Previous photo">‹</button>
              <button type="button" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 font-black text-villa-primary shadow-md" onClick={() => move(1)} aria-label="Next photo">›</button>
            </div>
            <p className="body-copy mt-3">{active.caption}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
