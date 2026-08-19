"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { loadGuestPhotos, readGuestPhotos, type GuestPhoto } from "../lib/gallery";

export default function GalleryPage() {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const sync = () => {
      setPhotos(readGuestPhotos());
      void loadGuestPhotos().then((nextPhotos) => {
        if (active) setPhotos(nextPhotos);
      });
    };
    sync();
    window.addEventListener("pet-villa-gallery", sync);
    return () => {
      active = false;
      window.removeEventListener("pet-villa-gallery", sync);
    };
  }, []);

  function move(direction: 1 | -1) {
    setActiveIndex((index) => {
      if (index === null || photos.length === 0) return index;
      return (index + direction + photos.length) % photos.length;
    });
  }

  const active = activeIndex === null ? null : photos[activeIndex];

  return (
    <OwnerSidebar>
      <section className="gallery-page min-h-screen">
      <main className="gallery-main">
        <section className="gallery-hero">
          <span>{t({ en: "Pet Villa Moments", zh: "Pet Villa 相册" })}</span>
          <h1>{t({ en: "Happy Guests Gallery", zh: "快乐小客人相册" })}</h1>
          <p>{t({ en: "Approved guest moments from Pet Villa stays and daycare.", zh: "Pet Villa 寄宿和日托的精选客人相册。" })}</p>
        </section>

        <section className="gallery-grid-wrap">
          {photos.length === 0 ? (
            <div className="gallery-empty">
              <span>PV</span>
              <h2>{t({ en: "No gallery photos yet", zh: "相册还没有照片" })}</h2>
              <p>{t({ en: "Approved Pet Villa moments will appear here after setup.", zh: "审核后的 Pet Villa 照片会显示在这里。" })}</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {photos.map((photo, index) => (
                <button key={photo.id} type="button" onClick={() => setActiveIndex(index)} className="gallery-photo-card">
                  <div>
                    <img src={photo.imageUrl || "/hero-dogs.webp"} alt={photo.petName} />
                  </div>
                  <strong>{photo.petName}</strong>
                  <span>{photo.breed}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {active ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-villa-text-primary/40 p-4 backdrop-blur-sm">
          <div className="gallery-modal">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="section-title">{active.petName}</h2>
                <p className="muted-copy m-0">{active.breed}</p>
              </div>
              <button type="button" className="gallery-close" onClick={() => setActiveIndex(null)}>x</button>
            </div>
            <div
              className="gallery-modal-photo"
              onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
              onTouchEnd={(event) => {
                if (touchStart === null) return;
                const delta = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
                if (Math.abs(delta) >= 35) move(delta < 0 ? 1 : -1);
                setTouchStart(null);
              }}
            >
              <img src={active.imageUrl || "/hero-dogs.webp"} alt={active.petName} />
              <button type="button" className="gallery-arrow left-3" onClick={() => move(-1)} aria-label="Previous photo">‹</button>
              <button type="button" className="gallery-arrow right-3" onClick={() => move(1)} aria-label="Next photo">›</button>
            </div>
            <p className="body-copy mt-3">{active.caption}</p>
          </div>
        </div>
      ) : null}
      </section>
    </OwnerSidebar>
  );
}
