"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { loadPetDiaryUpdatesForCustomer, type PetDiaryUpdate } from "../lib/diaryUpdates";
import { loadOrders, type VillaOrder } from "../lib/orderFlow";
import { dogAvatarSrc } from "../lib/petProfiles";

const whatsappUrl = "https://wa.me/601163830339?text=Hi%20Pet%20Villa%2C%20I%20would%20like%20to%20ask%20about%20my%20pet%27s%20stay.";

function CameraIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <rect x="7" y="14" width="34" height="25" rx="9" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.6" />
      <path d="M16 14l3-5h10l3 5" fill="#fff4df" stroke="#e8927c" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="24" cy="27" r="7" fill="#ead8ff" stroke="#8d65da" strokeWidth="2.6" />
      <circle cx="35" cy="20" r="2" fill="#ffc45b" />
    </svg>
  );
}

function DiaryIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <rect x="10" y="7" width="28" height="34" rx="8" fill="#fff7ef" stroke="#e8927c" strokeWidth="2.6" />
      <path d="M18 17h12M18 24h9M18 31h13" stroke="#8d65da" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M34 12h8v22h-8" fill="#f6d7bd" stroke="#e8927c" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

export default function DiaryPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<VillaOrder[]>([]);
  const [entries, setEntries] = useState<PetDiaryUpdate[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ entryId: string; index: number } | null>(null);
  const viewerTouchStart = useRef<number | null>(null);

  useEffect(() => {
    document.body.dataset.petVillaSurface = "diary";
    return () => {
      delete document.body.dataset.petVillaSurface;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let hasLoadedOnce = false;
    async function sync() {
      if (hasLoadedOnce) setRefreshing(true);
      try {
        const [latestOrders, latestEntries] = await Promise.all([
          loadOrders(),
          loadPetDiaryUpdatesForCustomer()
        ]);
        if (!active) return;
        const activeOrders = latestOrders.filter((order) => ["balance", "confirmed", "active", "staying", "awaiting_checkout", "ready_pickup", "completed"].includes(order.status));
        const activeOrderIds = new Set(activeOrders.map((order) => order.orderId));
        setOrders(activeOrders);
        setEntries(latestEntries.filter((entry) => activeOrderIds.has(entry.orderId)));
        setSelectedOrderId((current) => activeOrderIds.has(current) ? current : activeOrders[0]?.orderId || "");
        setSelectedPetId((current) => {
          const availablePetIds = new Set(activeOrders.flatMap((order) => order.pets.map((pet) => pet.id || pet.name)));
          return availablePetIds.has(current) ? current : activeOrders[0]?.pets[0]?.id || activeOrders[0]?.pets[0]?.name || "";
        });
        hasLoadedOnce = true;
        setHasLoaded(true);
        setLoadError("");
      } catch (error) {
        if (!active) return;
        setLoadError(hasLoadedOnce
          ? t({ en: "Unable to refresh — showing last known diary updates.", zh: "暂时无法刷新，正在显示上次同步的日记。" })
          : error instanceof Error ? error.message : t({ en: "Private Diary could not be loaded.", zh: "无法读取宠物日记。" }));
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    const handleSync = () => void sync();
    const handleVisibleSync = () => {
      if (document.visibilityState === "visible") void sync();
    };
    void sync();
    window.addEventListener("pet-villa-orders", handleSync);
    window.addEventListener("pet-villa-diary", handleSync);
    window.addEventListener("focus", handleVisibleSync);
    document.addEventListener("visibilitychange", handleVisibleSync);
    return () => {
      active = false;
      window.removeEventListener("pet-villa-orders", handleSync);
      window.removeEventListener("pet-villa-diary", handleSync);
      window.removeEventListener("focus", handleVisibleSync);
      document.removeEventListener("visibilitychange", handleVisibleSync);
    };
  }, []);

  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId);
  const selectedPet = selectedOrder?.pets.find((pet) => (pet.id || pet.name) === selectedPetId) || selectedOrder?.pets[0];
  const orderEntries = useMemo(
    () => entries.filter((entry) => (!selectedOrderId || entry.orderId === selectedOrderId) && (!selectedPetId || entry.petId === selectedPetId)),
    [entries, selectedOrderId, selectedPetId]
  );
  const petNames = selectedOrder?.pets.map((pet) => pet.name).join(", ") || orderEntries.map((entry) => entry.petName).filter(Boolean).join(", ") || t({ en: "Your pet", zh: "您的宠物" });
  const viewerEntry = mediaViewer ? entries.find((entry) => entry.id === mediaViewer.entryId) : undefined;
  const viewerMedia = viewerEntry?.media || [];

  useEffect(() => {
    if (!mediaViewer) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMediaViewer(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mediaViewer]);

  function moveViewer(direction: -1 | 1) {
    setMediaViewer((current) => {
      if (!current || !viewerMedia.length) return current;
      return { ...current, index: (current.index + direction + viewerMedia.length) % viewerMedia.length };
    });
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="owner-lite-page customer-diary-page">
          <header className="owner-lite-header customer-diary-header">
            <img className="customer-diary-hero-image" src="/assets/petvilla-diary-care-banner.webp" alt="" aria-hidden="true" />
            <div className="owner-lite-title">
              <span><DiaryIcon /></span>
              <div>
                <p>{t({ en: "Pet Villa Care", zh: "Pet Villa 照顾记录" })}</p>
                <h1>{t({ en: "Pet Diary", zh: "宠物日记" })}</h1>
              </div>
              <b>{orderEntries.length}</b>
            </div>
            <p className="owner-lite-copy">
              {orderEntries.length
                ? t({ en: `${petNames}'s private care updates are ready.`, zh: `${petNames} 的专属照顾记录已经更新。` })
                : t({ en: "Photos, videos and care notes will appear here after Pet Villa publishes them.", zh: "Pet Villa 发布照片、影片和照顾记录后，会显示在这里。" })}
            </p>
          </header>

          {orders.length || !hasLoaded ? (
            <div className="owner-lite-rail customer-diary-orders">
              {orders.length ? orders.map((order) => (
                <button key={order.orderId} type="button" onClick={() => { setSelectedOrderId(order.orderId); setSelectedPetId(order.pets[0]?.id || order.pets[0]?.name || ""); setExpanded(null); }} data-active={selectedOrderId === order.orderId}>
                  <span className="customer-diary-avatar-stack" aria-hidden="true">{order.pets.slice(0, 3).map((pet) => <img key={pet.id || pet.name} src={dogAvatarSrc(pet.photoDataUrl)} alt="" />)}</span>
                  <span className="customer-diary-selector-copy">
                    <strong>{order.pets.map((pet) => pet.name).join(" · ") || t({ en: "Pet stay", zh: "宠物入住" })}</strong>
                    <small>{order.dateLabel || order.orderId}</small>
                    <small className="customer-diary-service">{order.serviceLabel || t({ en: "Pet Villa stay", zh: "Pet Villa 入住" })}</small>
                  </span>
                  <span className="customer-diary-select-check" aria-hidden="true">✓</span>
                </button>
              )) : <span aria-busy="true">{t({ en: "Syncing stays...", zh: "正在同步入住记录..." })}</span>}
            </div>
          ) : null}

          <span className="sr-only" aria-live="polite">{refreshing ? t({ en: "Refreshing diary", zh: "正在同步宠物日记" }) : ""}</span>
          {loadError ? <p className="orders-message">{loadError}</p> : null}

          {selectedOrder && selectedOrder.pets.length > 1 ? (
            <div className="owner-lite-rail customer-diary-pets" aria-label="Choose pet">
              {selectedOrder.pets.map((pet) => {
                const petId = pet.id || pet.name;
                return <button key={petId} type="button" onClick={() => { setSelectedPetId(petId); setExpanded(null); }} data-active={(selectedPet?.id || selectedPet?.name) === petId}><img src={dogAvatarSrc(pet.photoDataUrl)} alt="" /><span><strong>{pet.name}</strong><small>{pet.breed || "Pet"}</small></span><span className="customer-diary-select-check" aria-hidden="true">✓</span></button>;
              })}
              <span className="sr-only">Currently showing {selectedPet?.name || "pet"}</span>
            </div>
          ) : null}

          {selectedOrder ? (
            <section className="customer-diary-stay">
              <div><span>{t({ en: "Selected stay", zh: "当前入住" })}</span><strong>{petNames}</strong><small>{selectedOrder.dateLabel}</small></div>
              <b>{orderEntries.length} {t({ en: "updates", zh: "则更新" })}</b>
            </section>
          ) : null}

          {!loading && hasLoaded && !orders.length && !entries.length ? (
            <section className="owner-empty-card">
              <span><DiaryIcon /></span>
              <h2>{t({ en: "No stays yet", zh: "还没有入住记录" })}</h2>
              <p>{t({ en: "After a confirmed stay, private diary updates will appear here.", zh: "确认入住后，专属宠物日记会显示在这里。" })}</p>
              <a href="/booking" className="orders-primary-action">{t({ en: "Book a Stay", zh: "立即预约" })}</a>
            </section>
          ) : null}

          {!loading && hasLoaded && (orders.length > 0 || selectedOrderId) && orderEntries.length === 0 ? (
            <section className="owner-empty-card">
              <span><CameraIcon /></span>
              <h2>{t({ en: "No diary updates yet", zh: "还没有日记更新" })}</h2>
              <p>{t({ en: `${petNames}'s photos, videos and notes will appear here once our team publishes them.`, zh: `我们的团队发布后，${petNames} 的照片、影片和照顾记录会显示在这里。` })}</p>
              <a href={whatsappUrl} className="orders-primary-action">{t({ en: "WhatsApp Us", zh: "WhatsApp 联系我们" })}</a>
            </section>
          ) : null}

          {orderEntries.length ? (
            <div className="customer-diary-feed">
              {orderEntries.map((entry, index) => {
                const open = expanded === entry.id || (expanded === null && index === 0);
                const entryPet = selectedOrder?.pets.find((pet) => pet.id === entry.petId || pet.name === entry.petName) || selectedPet;
                const careItems = [
                  { label: t({ en: "Meal", zh: "饮食" }), value: entry.mealNotes },
                  { label: t({ en: "Water", zh: "饮水" }), value: entry.waterNotes },
                  { label: t({ en: "Activity", zh: "活动" }), value: entry.activityNotes },
                  { label: t({ en: "Toilet", zh: "排便" }), value: entry.toiletNotes },
                  { label: t({ en: "Health", zh: "健康" }), value: entry.healthNotes },
                  { label: t({ en: "Medication", zh: "药物" }), value: entry.medicationNotes },
                  { label: t({ en: "Care", zh: "照顾" }), value: entry.careNotes },
                  { label: t({ en: "Reminder", zh: "提醒" }), value: entry.reminderNotes }
                ].filter((item) => Boolean(item.value));
                return (
                  <article key={entry.id} className="customer-diary-entry" data-alert={entry.healthAlert || undefined}>
                    <button type="button" onClick={() => setExpanded(open ? "closed" : entry.id)} className="customer-diary-entry-head">
                      <span><img src={dogAvatarSrc(entryPet?.photoDataUrl)} alt="" /></span>
                      <span><small>{new Date(entry.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</small><strong>{entry.petName} · {entry.mood}</strong><b>{entry.media.length} {t({ en: "media", zh: "个照片/影片" })}</b></span>
                      <i>{open ? "−" : "+"}</i>
                    </button>
                    {open ? (
                      <div className="customer-diary-entry-body">
                        <p>{entry.body}</p>
                        {careItems.length ? <div className="customer-diary-notes">{careItems.map((item) => <span key={item.label} data-wide={item.value && item.value.length > 36 ? "true" : undefined}><small>{item.label}</small><strong>{item.value}</strong></span>)}</div> : null}
                        {entry.media.length ? (
                          <div className="customer-diary-media">
                            {entry.media.map((media, mediaIndex) => (
                              <button key={`${media.url}-${mediaIndex}`} type="button" onClick={() => setMediaViewer({ entryId: entry.id, index: mediaIndex })} aria-label={t({ en: `Open ${entry.petName} media ${mediaIndex + 1}`, zh: `打开 ${entry.petName} 的第 ${mediaIndex + 1} 个媒体` })}>
                                {media.type === "video" ? <><video src={media.url} muted playsInline preload="metadata" /><i aria-hidden="true">▶</i></> : <img src={media.url} alt={`${entry.petName} ${mediaIndex + 1}`} />}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {entry.healthAlert ? <div className="customer-diary-alert">{t({ en: "Important care note from Pet Villa. Please review this update carefully.", zh: "这是 Pet Villa 的重要照顾提醒，请仔细查看。" })}</div> : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
          {mediaViewer && viewerEntry && viewerMedia[mediaViewer.index] ? (
            <div className="customer-diary-viewer" role="dialog" aria-modal="true" aria-label={t({ en: `${viewerEntry.petName} diary media`, zh: `${viewerEntry.petName} 的日记媒体` })} onClick={() => setMediaViewer(null)}>
              <div
                className="customer-diary-viewer-shell"
                onClick={(event) => event.stopPropagation()}
                onTouchStart={(event) => { viewerTouchStart.current = event.changedTouches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                  const start = viewerTouchStart.current;
                  const end = event.changedTouches[0]?.clientX;
                  viewerTouchStart.current = null;
                  if (start == null || end == null || Math.abs(end - start) < 45) return;
                  moveViewer(end < start ? 1 : -1);
                }}
              >
                <button type="button" className="customer-diary-viewer-close" onClick={() => setMediaViewer(null)} aria-label={t({ en: "Close media viewer", zh: "关闭媒体查看" })}>×</button>
                <div className="customer-diary-viewer-stage">
                  {viewerMedia[mediaViewer.index].type === "video" ? <video src={viewerMedia[mediaViewer.index].url} controls autoPlay playsInline /> : <img src={viewerMedia[mediaViewer.index].url} alt={`${viewerEntry.petName} ${mediaViewer.index + 1}`} />}
                </div>
                <footer>
                  <span><strong>{viewerEntry.petName}</strong><small>{mediaViewer.index + 1} / {viewerMedia.length}</small></span>
                  {viewerMedia.length > 1 ? <div><button type="button" onClick={() => moveViewer(-1)} aria-label={t({ en: "Previous media", zh: "上一个" })}>‹</button><button type="button" onClick={() => moveViewer(1)} aria-label={t({ en: "Next media", zh: "下一个" })}>›</button></div> : null}
                </footer>
              </div>
            </div>
          ) : null}
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
