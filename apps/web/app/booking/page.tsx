"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { createEmptyPet, dogAvatarSrc, loadPetProfiles, savePetProfile, type PetProfile } from "../lib/petProfiles";
import { loadOrders, saveBookingDraft } from "../lib/orderFlow";
import { isHostOffDay, loadHostOffDays } from "../lib/hostAvailability";
import { daysInclusive, eachDateInRange, startOfLocalDay, toDateKey } from "../lib/bookingCapacity";
import { loadBusinessSettings, type BusinessSettings } from "../lib/businessSettings";
import { calculateServiceSubtotal } from "../lib/pricing";

const timeOptions = ["9:00am", "10:00am", "11:00am", "12:00pm", "1:00pm", "2:00pm", "3:00pm", "4:00pm", "5:00pm", "6:00pm", "7:00pm", "8:00pm"];
type AvailabilityStatus = "loading" | "ready" | "refreshing" | "stale" | "error";
type PricingStatus = "loading" | "ready" | "error";

function hourIndex(value: string) {
  return timeOptions.indexOf(value) + 9;
}

function createLocalDate(year: number, month: number, day: number) {
  return new Date(year, month, day);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFullDateRange(start: Date, end: Date) {
  if (toDateKey(start) === toDateKey(end)) return formatFullDate(start);
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${formatFullDate(end)}`;
  }
  return `${formatFullDate(start)} - ${formatFullDate(end)}`;
}

function monthCells(month: Date) {
  const first = createLocalDate(month.getFullYear(), month.getMonth(), 1);
  const blankCount = (first.getDay() + 6) % 7;
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: blankCount }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => createLocalDate(month.getFullYear(), month.getMonth(), index + 1))
  ];
}

function ServiceIcon({ type }: { type: "overnight" | "daycare" }) {
  if (type === "overnight") {
    return (
      <svg viewBox="0 0 56 56" className="h-9 w-9" aria-hidden="true">
        <path d="M37 41A17 17 0 0 1 23 13a19 19 0 1 0 23 23 17 17 0 0 1-9 5Z" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
        <path d="M43 13v7M39.5 16.5h7" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 56" className="h-9 w-9" aria-hidden="true">
      <circle cx="28" cy="28" r="11" fill="#ffd45b" stroke="#d9922e" strokeWidth="3" />
      <path d="M28 7v8M28 41v8M7 28h8M41 28h8M13 13l6 6M37 37l6 6M43 13l-6 6M19 37l-6 6" stroke="#d9922e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 40 40" className="h-5 w-5" aria-hidden="true">
      <rect x="7" y="9" width="26" height="25" rx="5" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.5" />
      <path d="M7 17h26M14 6v7M26 6v7" stroke="#e8927c" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DogAvatar({ pet }: { pet?: PetProfile }) {
  if (pet?.photoDataUrl) {
    return <img src={dogAvatarSrc(pet.photoDataUrl)} alt="" className="h-14 w-14 shrink-0 rounded-[16px] object-cover" />;
  }
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-villa-primary-bg">
      <svg viewBox="0 0 72 72" className="h-full w-full" aria-hidden="true">
        <circle cx="36" cy="37" r="22" fill="#d99a62" />
        <path d="M17 34c-8 2-11 12-8 20 3 7 12 8 17 1M55 34c8 2 11 12 8 20-3 7-12 8-17 1" fill="#bd7844" />
        <circle cx="28" cy="38" r="3" fill="#3d1f0d" />
        <circle cx="44" cy="38" r="3" fill="#3d1f0d" />
        <ellipse cx="36" cy="47" rx="6" ry="4" fill="#3d1f0d" />
        <path d="M30 54c4 4 8 4 12 0" fill="none" stroke="#3d1f0d" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function CheckMark({ active }: { active: boolean }) {
  return (
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${active ? "border-villa-primary bg-villa-primary text-white" : "border-villa-primary-light bg-white text-transparent"}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function BookingPage() {
  const { t, lang } = useLanguage();
  const today = startOfLocalDay(new Date());
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [service, setService] = useState<"overnight" | "daycare">("overnight");
  const [dateTouched, setDateTouched] = useState(false);
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => createLocalDate(today.getFullYear(), today.getMonth(), 1));
  const [startDate, setStartDate] = useState(() => createLocalDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [endDate, setEndDate] = useState(() => createLocalDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [startTime, setStartTime] = useState("10:00am");
  const [endTime, setEndTime] = useState("2:00pm");
  const [specialRequest, setSpecialRequest] = useState("");
  const [operationalWhatsAppConsent, setOperationalWhatsAppConsent] = useState(false);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("loading");
  const availabilityLoadedRef = useRef(false);
  const [quickPetOpen, setQuickPetOpen] = useState(false);
  const [quickPet, setQuickPet] = useState<PetProfile>(() => createEmptyPet());
  const [quickPetError, setQuickPetError] = useState("");
  const [savingQuickPet, setSavingQuickPet] = useState(false);
  const [paymentPromptKind, setPaymentPromptKind] = useState<"date" | "pet" | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [pricingStatus, setPricingStatus] = useState<PricingStatus>("loading");
  const [bookingDataMessage, setBookingDataMessage] = useState("");
  const [petsLoaded, setPetsLoaded] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);

  const refreshAvailability = useCallback(async () => {
    setAvailabilityStatus(availabilityLoadedRef.current ? "refreshing" : "loading");
    try {
      const days = await loadHostOffDays();
      setOffDays(days);
      availabilityLoadedRef.current = true;
      setAvailabilityStatus("ready");
      return days;
    } catch (error) {
      setAvailabilityStatus(availabilityLoadedRef.current ? "stale" : "error");
      throw error;
    }
  }, []);

  useEffect(() => {
    document.body.dataset.petVillaSurface = "booking";
    return () => {
      delete document.body.dataset.petVillaSurface;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let hasLoadedOnce = false;
    function reportFailure(error: unknown) {
      if (!active) return;
      setBookingDataMessage(hasLoadedOnce
        ? t({ en: "Unable to refresh — showing last known booking data.", zh: "暂时无法刷新，正在显示上次同步的预约资料。" })
        : error instanceof Error ? error.message : t({ en: "Booking data could not be loaded.", zh: "无法读取预约资料。" }));
    }
    async function syncPets() {
      try {
        const nextPets = await loadPetProfiles();
        if (!active) return;
        setPets(nextPets);
        setPetsLoaded(true);
        setSelectedPets((current) => current.filter((id) => nextPets.some((pet) => pet.id === id)));
      } catch (error) {
        reportFailure(error);
      }
    }
    async function syncRemoteData() {
      if (hasLoadedOnce) setRefreshingData(true);
      const results = await Promise.allSettled([
        syncPets(),
        loadOrders(),
        loadBusinessSettings()
          .then((settings) => {
            if (!active) return;
            setBusinessSettings(settings);
            setPricingStatus("ready");
          })
          .catch((error) => {
            if (active) setPricingStatus("error");
            throw error;
          })
      ]);
      if (!active) return;
      const rejection = results.find((result) => result.status === "rejected");
      if (rejection?.status === "rejected") reportFailure(rejection.reason);
      else {
        hasLoadedOnce = true;
        setBookingDataMessage("");
      }
      setRefreshingData(false);
    }
    void syncRemoteData();
    void refreshAvailability().catch(() => undefined);
    function handlePetsChanged() {
      void syncPets();
    }
    function syncAvailability() {
      void refreshAvailability().catch(() => undefined);
    }
    function handleVisibleRefresh() {
      if (document.visibilityState === "visible") void syncRemoteData();
    }
    window.addEventListener("pet-villa-pets", handlePetsChanged);
    window.addEventListener("pet-villa-availability", syncAvailability);
    window.addEventListener("focus", handleVisibleRefresh);
    document.addEventListener("visibilitychange", handleVisibleRefresh);
    return () => {
      active = false;
      window.removeEventListener("pet-villa-pets", handlePetsChanged);
      window.removeEventListener("pet-villa-availability", syncAvailability);
      window.removeEventListener("focus", handleVisibleRefresh);
      document.removeEventListener("visibilitychange", handleVisibleRefresh);
    };
  }, [refreshAvailability]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get("service");
    if (serviceParam === "daycare" || serviceParam === "overnight") {
      chooseService(serviceParam);
    }
    const dateParam = params.get("date");
    if (dateParam) {
      const [year, month, day] = dateParam.split("-").map(Number);
      const nextDate = createLocalDate(year, (month || 1) - 1, day || 1);
      if (!Number.isNaN(nextDate.getTime()) && nextDate >= today) {
        setStartDate(nextDate);
        setEndDate(nextDate);
        setVisibleMonth(createLocalDate(nextDate.getFullYear(), nextDate.getMonth(), 1));
        setDateTouched(true);
      }
    }
  }, []);

  const selectedPetObjects = pets.filter((pet) => selectedPets.includes(pet.id));
  const petCount = Math.max(1, selectedPets.length);
  const selectedPetNames = selectedPetObjects.map((pet) => pet.name);
  const daycareHours = Math.max(1, hourIndex(endTime) - hourIndex(startTime));
  const overnightNights = daysInclusive(startDate, endDate);
  const configuredBoardingRate = Number(businessSettings?.boardingRate);
  const configuredDaycareRate = Number(businessSettings?.daycareRate);
  const pricingReady = pricingStatus === "ready"
    && Number.isFinite(configuredBoardingRate)
    && configuredBoardingRate >= 0
    && Number.isFinite(configuredDaycareRate)
    && configuredDaycareRate >= 0;
  const pricingMessage = pricingStatus === "error"
    ? t({ en: "Price unavailable", zh: "价格暂时无法读取" })
    : t({ en: "Loading price...", zh: "正在读取价格..." });
  const pricingNotice = pricingStatus === "error"
    ? t({ en: "Current pricing is unavailable. Please try again shortly.", zh: "目前无法读取最新价格，请稍后再试。" })
    : t({ en: "Loading current pricing...", zh: "正在读取最新价格..." });
  const boardingRate = pricingReady ? configuredBoardingRate : 0;
  const daycareRate = pricingReady ? configuredDaycareRate : 0;
  const subtotal = pricingReady && selectedPets.length > 0 ? calculateServiceSubtotal({
    service,
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
    hours: daycareHours,
    petCount,
    settings: {
      boardingRate,
      daycareRate,
      specialDateRates: businessSettings?.specialDateRates
    }
  }) : 0;
  const unitTotal = petCount > 0 ? subtotal / petCount : 0;
  const total = subtotal;
  const deposit = service === "daycare" || total < 50 ? 0 : 50;
  const balance = Math.max(0, total - deposit);
  const availabilityKnown = availabilityStatus === "ready" || availabilityStatus === "refreshing" || availabilityStatus === "stale";
  const offDayIssue = availabilityKnown && eachDateInRange(startDate, endDate).some((date) => isHostOffDay(toDateKey(date), offDays));

  const dateLabel = useMemo(() => {
    if (service === "daycare") return `${formatFullDate(startDate)}, ${startTime} - ${endTime}`;
    return formatFullDateRange(startDate, endDate);
  }, [endDate, endTime, service, startDate, startTime]);
  const displayDateLabel = dateTouched ? dateLabel : t({ en: "Please select your date", zh: "请先选择日期" });
  const displayDateSubcopy = dateTouched
    ? !pricingReady
      ? pricingMessage
      : service === "overnight"
      ? t({ en: `${overnightNights} Nights Selected · RM${unitTotal} / pet`, zh: `已选 ${overnightNights} 晚 · 每只 RM${unitTotal}` })
      : t({ en: `${daycareHours} Hours Selected · RM${unitTotal} / pet`, zh: `已选 ${daycareHours} 小时 · 每只 RM${unitTotal}` })
    : t({ en: "Tap one calendar date below before payment.", zh: "请点击下方日历日期后再继续付款。" });

  const serviceCompleted = Boolean(service);
  const dateCompleted = serviceCompleted && dateTouched;
  const petCompleted = dateCompleted && selectedPets.length > 0;
  const confirmCompleted = petCompleted && pricingReady && total > 0 && availabilityKnown && !offDayIssue;
  const currentStep = !serviceCompleted ? 0 : !dateCompleted ? 1 : !petCompleted ? 2 : 3;

  function chooseService(nextService: "overnight" | "daycare") {
    setService(nextService);
    if (nextService === "daycare") {
      setEndDate(startDate);
    }
  }

  function chooseDate(date: Date) {
    if (!availabilityKnown || date < today || isHostOffDay(toDateKey(date), offDays)) return;
    setDateTouched(true);
    if (!dateTouched) {
      setStartDate(date);
      setEndDate(date);
      return;
    }
    if (service === "daycare") {
      setStartDate(date);
      setEndDate(date);
      return;
    }
    if (toDateKey(startDate) === toDateKey(endDate)) {
      if (date > startDate) {
        setEndDate(date);
      } else {
        setStartDate(date);
      }
      return;
    }
    if (date > endDate) {
      setEndDate(date);
      return;
    }
    if (date < startDate) {
      setStartDate(date);
      setEndDate(date);
    } else {
      setStartDate(date);
      setEndDate(date);
    }
  }

  function togglePet(id: string) {
    const alreadySelected = selectedPets.includes(id);
    setSelectedPets((current) => {
      if (current.includes(id)) {
        return current.filter((petId) => petId !== id);
      }
      return [...current, id];
    });
    if (!alreadySelected) setPaymentPromptKind(null);
  }

  async function saveQuickPet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickPet.name.trim() || !quickPet.breed.trim()) {
      setQuickPetError(t({ en: "Please add your pet's name and breed.", zh: "请填写宠物名字和品种。" }));
      return;
    }
    const normalizedWeight = quickPet.weight.trim()
      ? `${quickPet.weight.replace(/kg/gi, "").trim()}kg`
      : "";
    setSavingQuickPet(true);
    try {
      const petToSave = { ...quickPet, weight: normalizedWeight };
      const nextPets = await savePetProfile(petToSave);
      setPets(nextPets);
      setSelectedPets((current) => Array.from(new Set([...current, petToSave.id])));
      setQuickPet(createEmptyPet());
      setQuickPetOpen(false);
      setQuickPetError("");
      setPaymentPromptKind(null);
    } catch {
      setQuickPetError(t({ en: "Could not save this pet. Please try again.", zh: "无法保存这只宠物，请再试一次。" }));
    } finally {
      setSavingQuickPet(false);
    }
  }

  function stepState(index: number) {
    if (confirmCompleted || index < currentStep) return "done";
    if (index === currentStep) return "current";
    return "upcoming";
  }

  async function saveDraftForPayment() {
    if (!dateTouched) {
      setPaymentPromptKind("date");
      window.setTimeout(() => {
        document.getElementById("booking-choose-date")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }
    if (selectedPets.length === 0) {
      setPaymentPromptKind("pet");
      window.setTimeout(() => {
        document.getElementById("booking-choose-pets")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }
    if (!operationalWhatsAppConsent) {
      setBookingDataMessage(t({ en: "Please agree to the required operational WhatsApp service updates before continuing to payment.", zh: "请先同意必要的 WhatsApp 服务通知，才可以继续付款。" }));
      document.getElementById("booking-whatsapp-consent")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!pricingReady) {
      setBookingDataMessage(pricingNotice);
      return;
    }
    if (!confirmCompleted) return;
    const appliedTotal = subtotal;
    const appliedDeposit = service === "daycare" || appliedTotal < 50 ? 0 : 50;
    const appliedBalance = Math.max(0, appliedTotal - appliedDeposit);
    try {
      await saveBookingDraft({
      id: `draft-${Date.now()}`,
      service,
      serviceLabel: service === "overnight" ? "Overnight Boarding" : "Daycare",
      dateLabel,
      startDateISO: toDateKey(startDate),
      endDateISO: toDateKey(endDate),
      nights: service === "overnight" ? overnightNights : 0,
      hours: service === "daycare" ? daycareHours : 0,
      pets: selectedPetObjects.map((pet) => ({
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        weight: pet.weight,
        photoDataUrl: pet.photoDataUrl
      })),
      total: appliedTotal,
      subtotal,
      voucherDiscount: 0,
      appliedVouchers: [],
      deposit: appliedDeposit,
      balance: appliedBalance,
      specialRequest,
      operationalWhatsappConsentLanguage: lang === "zh" ? "zh" : "en",
      createdAt: new Date().toISOString()
      });
      window.location.href = "/payment";
    } catch (error) {
      setBookingDataMessage(error instanceof Error
        ? error.message
        : t({ en: "Your booking could not be saved. Please try again.", zh: "预约无法保存，请重试。" }));
    }
  }

  const steps = [
    t({ en: "Service", zh: "服务" }),
    t({ en: "Date", zh: "日期" }),
    t({ en: "Pet", zh: "宠物" }),
    t({ en: "Confirm", zh: "确认" })
  ];
  const selectedServiceTitle = service === "overnight"
    ? t({ en: "Boarding", zh: "寄宿" })
    : t({ en: "Daycare", zh: "日托" });
  const boardingPriceLabel = pricingReady ? `RM${boardingRate}/night` : pricingMessage;
  const daycarePriceLabel = pricingReady ? `RM${daycareRate}/hour` : pricingMessage;
  const selectedServicePrice = service === "overnight" ? boardingPriceLabel : daycarePriceLabel;
  const pricingAmount = (amount: number) => pricingReady ? `RM${amount}` : pricingMessage;
  const selectedServiceMeta = !dateTouched
    ? t({ en: "Pick a calendar date to continue.", zh: "请先选择日历日期再继续。" })
    : service === "overnight"
      ? t({ en: `${overnightNights} night${overnightNights === 1 ? "" : "s"} selected`, zh: `已选 ${overnightNights} 晚` })
      : t({ en: `${daycareHours} hours selected`, zh: `已选 ${daycareHours} 小时` });
  const heroImage = service === "overnight"
    ? "/petvilla-booking-boarding-banner.webp"
    : "/petvilla-booking-daycare-banner.webp";
  const depositLabel = !pricingReady
    ? t({ en: "Pricing", zh: "价格" })
    : service === "daycare" || (total > 0 && deposit === 0)
    ? t({ en: "No Deposit", zh: "无需订金" })
    : t({ en: "Deposit", zh: "订金" });
  const petLabel = selectedPets.length > 0
    ? `${selectedPets.length} ${selectedPets.length === 1 ? t({ en: "pet", zh: "只宠物" }) : t({ en: "pets", zh: "只宠物" })}`
    : t({ en: "Choose pet", zh: "选择宠物" });

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="booking-page">
          <header className="booking-hero booking-live-hero">
            <img key={heroImage} src={heroImage} alt="" />
            <span className="booking-float-pill" data-position="left">
              <CalendarIcon />
              {dateTouched ? dateLabel : t({ en: "Pick your date", zh: "选择日期" })}
            </span>
            <div className="booking-live-copy">
              <span className="booking-live-chip">{t({ en: "Pet Villa Booking", zh: "Pet Villa 预约" })}</span>
              <h1 className="m-0 mt-3 font-title text-[30px] font-black leading-[1.02] text-villa-text-primary">{t({ en: "Book a Stay", zh: "预约照顾" })}</h1>
              <div className="booking-service-pill" data-service={service}>
                <span className="booking-service-icon"><ServiceIcon type={service} /></span>
                <span>
                  <strong>{selectedServiceTitle}</strong>
                  <small>{selectedServicePrice}</small>
                </span>
              </div>
              <p className="m-0 mt-2 text-[12px] font-black leading-snug text-villa-text-secondary">{selectedServiceMeta}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="booking-live-stat">
                  <span className="whitespace-nowrap text-[9px] font-black text-villa-text-secondary">{depositLabel}</span>
                  <strong className="mt-1 text-[18px] font-black leading-none text-[#d97867]">{pricingAmount(deposit)}</strong>
                </div>
                <div className="booking-live-stat">
                  <span className="text-[10px] font-black text-villa-text-secondary">{t({ en: "Pets", zh: "宠物" })}</span>
                  <strong className="mt-1 text-[18px] font-black leading-none text-villa-text-primary">{selectedPets.length}</strong>
                </div>
              </div>
            </div>
          </header>

          {refreshingData ? <p className="booking-sync-note">{t({ en: "Refreshing booking details...", zh: "正在同步预约资料..." })}</p> : null}
          {bookingDataMessage ? <p className="booking-sync-note" role="status">{bookingDataMessage}</p> : null}
          {!pricingReady && !bookingDataMessage ? (
            <p className="booking-sync-note" role={pricingStatus === "error" ? "alert" : "status"} aria-busy={pricingStatus === "loading"}>
              {pricingNotice}
            </p>
          ) : null}
          {!petsLoaded && !bookingDataMessage ? <p className="booking-sync-note" aria-busy="true">{t({ en: "Syncing your pets and availability...", zh: "正在同步宠物与可预约日期..." })}</p> : null}
          {availabilityStatus === "loading" ? <p className="booking-sync-note" aria-busy="true">{t({ en: "Checking live date availability...", zh: "正在查询最新可预约日期..." })}</p> : null}
          {availabilityStatus === "refreshing" ? <p className="booking-sync-note" aria-busy="true">{t({ en: "Refreshing date availability...", zh: "正在刷新可预约日期..." })}</p> : null}
          {availabilityStatus === "stale" ? (
            <div className="booking-sync-note flex items-center justify-between gap-3" role="status">
              <span>{t({ en: "Unable to refresh — showing last known availability.", zh: "暂时无法刷新，正在显示上次同步的预约状态。" })}</span>
              <button type="button" className="font-black text-villa-primary underline" onClick={() => void refreshAvailability().catch(() => undefined)}>{t({ en: "Retry", zh: "重试" })}</button>
            </div>
          ) : null}
          {availabilityStatus === "error" ? (
            <div className="booking-sync-note flex items-center justify-between gap-3 text-red-700" role="alert">
              <span>{t({ en: "Availability is temporarily unavailable. Dates are disabled until it is restored.", zh: "预约状态暂时无法读取，恢复前所有日期均不可选择。" })}</span>
              <button type="button" className="shrink-0 font-black underline" onClick={() => void refreshAvailability().catch(() => undefined)}>{t({ en: "Retry", zh: "重试" })}</button>
            </div>
          ) : null}

          <section className="booking-choice-dock" aria-label={t({ en: "Current booking choices", zh: "当前预约选择" })}>
            <div className="booking-choice-chip" data-tone="warm">
              <span><ServiceIcon type={service} /></span>
              <div>
                <strong>{selectedServiceTitle}</strong>
                <small>{selectedServicePrice}</small>
              </div>
            </div>
            <div className="booking-choice-chip" data-tone="lavender">
              <span><CalendarIcon /></span>
              <div>
                <strong>{dateTouched ? (service === "overnight" ? `${overnightNights} ${t({ en: "night", zh: "晚" })}` : `${daycareHours}h`) : t({ en: "Pick date", zh: "选择日期" })}</strong>
                <small>{dateTouched ? formatFullDate(startDate) : t({ en: "Required", zh: "必选" })}</small>
              </div>
            </div>
            <div className="booking-choice-chip" data-tone="mint">
              <span><DogAvatar /></span>
              <div>
                <strong>{petLabel}</strong>
                <small>{selectedPetNames.length ? selectedPetNames.join(", ") : t({ en: "Required", zh: "必选" })}</small>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="grid gap-4">
              <div className="booking-stepper">
                <div className="grid grid-cols-4 items-start gap-1">
                  {steps.map((step, index) => {
                    const state = stepState(index);
                    return (
                      <div key={step} className="relative grid justify-items-center gap-1 text-center">
                        {index > 0 ? <span className={`absolute right-1/2 top-[15px] h-1 w-full rounded-full ${stepState(index - 1) === "done" ? "bg-[#c6a7ff]" : "bg-white/80"}`} /> : null}
                        <span className="booking-step-dot" data-state={state}>
                          {state === "done" ? "✓" : index + 1}
                        </span>
                        <span className={`text-[11px] font-black ${state === "upcoming" ? "text-villa-text-muted" : "text-[#8d65da]"}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <section id="booking-choose-service" className="booking-panel">
                <h2 className="booking-panel-title">{t({ en: "Choose Service", zh: "选择服务" })}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "overnight" as const, title: t({ en: "Overnight Boarding", zh: "过夜寄宿" }), price: boardingPriceLabel, desc: t({ en: "No cages · 24h Care", zh: "不关笼 · 24小时照顾" }) },
                    { id: "daycare" as const, title: t({ en: "Daycare", zh: "日托" }), price: daycarePriceLabel, desc: "9:00am – 8:00pm" }
                  ].map((item) => {
                    const active = service === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseService(item.id)}
                        className="booking-option"
                        data-active={active}
                        data-service={item.id}
                      >
                        <span className="booking-icon-cup"><ServiceIcon type={item.id} /></span>
                        <span className="min-w-0 flex-1">
                          <strong className="block font-title text-[18px] font-black leading-tight text-villa-text-primary">{item.title}</strong>
                          <span className="mt-1 block text-sm font-black text-villa-primary">{item.price}</span>
                          <span className="mt-0.5 block text-xs font-bold text-villa-text-secondary">{item.desc}</span>
                        </span>
                        <CheckMark active={active} />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section id="booking-choose-date" className="booking-panel">
                <h2 className="booking-panel-title">{t({ en: "Choose Date / Time", zh: "选择日期 / 时间" })}</h2>
                <div className="booking-date-summary" data-empty={!dateTouched}>
                  <span className="booking-date-summary-icon"><CalendarIcon /></span>
                  <div className="booking-date-summary-copy">
                    <p>{dateTouched ? displayDateLabel : t({ en: "Pick your stay date", zh: "请选择入住日期" })}</p>
                    <small>{dateTouched ? displayDateSubcopy : t({ en: "Tap a calendar day below before payment.", zh: "请先点击下方日历日期，再继续付款。" })}</small>
                  </div>
                  <button
                    type="button"
                    className="booking-date-summary-action"
                    onClick={() => document.querySelector(".booking-calendar-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  >
                    {dateTouched && pricingReady ? `RM${unitTotal}` : dateTouched ? pricingMessage : t({ en: "Choose", zh: "选择" })}
                  </button>
                </div>

                {service === "daycare" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "Start time", zh: "开始时间" })}</span>
                      <select className="villa-input" value={startTime} onChange={(event) => setStartTime(event.target.value)}>
                        {timeOptions.slice(0, -1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "End time", zh: "结束时间" })}</span>
                      <select className="villa-input" value={endTime} onChange={(event) => setEndTime(event.target.value)}>
                        {timeOptions.slice(1).map((time) => <option key={time}>{time}</option>)}
                      </select>
                    </label>
                  </div>
                ) : null}

                <div className="booking-calendar-card">
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-lg font-black text-villa-text-primary shadow-[0_7px_14px_rgba(61,31,13,0.08)]" onClick={() => setVisibleMonth(createLocalDate(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>‹</button>
                    <strong className="text-sm">{monthLabel(visibleMonth)}</strong>
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-lg font-black text-villa-text-primary shadow-[0_7px_14px_rgba(61,31,13,0.08)]" onClick={() => setVisibleMonth(createLocalDate(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-villa-text-muted">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {monthCells(visibleMonth).map((date, index) => {
                      if (!date) return <span key={`blank-${index}`} />;
                      const past = date < today;
                      const off = isHostOffDay(toDateKey(date), offDays);
                      const disabled = !availabilityKnown || past || off;
                      const active = dateTouched && date >= startOfLocalDay(startDate) && date <= startOfLocalDay(endDate);
                      const isToday = toDateKey(date) === toDateKey(today);
                      return (
                        <button
                          key={toDateKey(date)}
                          type="button"
                          disabled={disabled}
                          onClick={() => chooseDate(date)}
                          title={!availabilityKnown ? "Availability unavailable" : off ? "Full" : past ? "Past date" : "Available"}
                          className="booking-day"
                          data-state={disabled ? "disabled" : active ? "active" : isToday ? "today" : "available"}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section id="booking-choose-pets" className="booking-panel">
                <h2 className="booking-panel-title">{t({ en: "Choose Pets", zh: "选择宠物" })}</h2>
                {pets.length === 0 ? (
                  <div className="mt-3 rounded-[24px] border border-white/90 bg-[#fff0d5] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_12px_24px_rgba(61,31,13,0.08)]">
                    <h3 className="font-title text-xl font-black text-villa-text-primary">{t({ en: "Please add your pet first before booking.", zh: "预约前请先添加宠物资料。" })}</h3>
                    <button type="button" className="booking-primary mt-4" onClick={() => setQuickPetOpen(true)}>{t({ en: "Add Pet Here", zh: "在这里新增宠物" })}</button>
                  </div>
                ) : (
                  <>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="m-0 text-xs font-bold text-villa-text-secondary">{t({ en: "Select the pet(s) staying with us.", zh: "选择这次要入住的宠物。" })}</p>
                      <button type="button" className="booking-add-pet-link" onClick={() => setQuickPetOpen((value) => !value)}>
                        {quickPetOpen ? t({ en: "Close", zh: "收起" }) : t({ en: "+ Add pet", zh: "+ 新增宠物" })}
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {pets.map((pet) => {
                        const active = selectedPets.includes(pet.id);
                        return (
                          <button
                            key={pet.id}
                            type="button"
                            onClick={() => togglePet(pet.id)}
                            className="booking-option relative min-h-[92px]"
                            data-active={active}
                          >
                            <DogAvatar pet={pet} />
                            <span className="min-w-0 flex-1">
                              <strong className="block font-title text-[18px] font-black leading-tight text-villa-text-primary">{pet.name}</strong>
                              <span className="mt-1 block text-xs font-bold text-villa-text-secondary">{pet.breed} · {pet.weight}</span>
                              <span className="mt-1.5 flex flex-wrap gap-1.5">
                                {pet.vaccinated ? <span className="rounded-full bg-[#eef5eb] px-2 py-0.5 text-[10px] font-black text-villa-accent-green">✓ {t({ en: "Vaccinated", zh: "已接种" })}</span> : null}
                                {pet.calm ? <span className="rounded-full bg-villa-primary-bg px-2 py-0.5 text-[10px] font-black text-villa-primary">✓ {t({ en: "Calm", zh: "稳定" })}</span> : null}
                              </span>
                            </span>
                            <CheckMark active={active} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {quickPetOpen ? (
                  <form className="booking-add-pet-card mt-3" onSubmit={(event) => void saveQuickPet(event)}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="m-0 text-[11px] font-black uppercase text-[#8d65da]">{t({ en: "Quick Add", zh: "快速新增" })}</p>
                        <h3 className="m-0 mt-1 font-title text-[20px] font-black leading-tight text-villa-text-primary">{t({ en: "Another Pet", zh: "另一只宠物" })}</h3>
                      </div>
                      <button type="button" className="booking-add-pet-link" onClick={() => setQuickPetOpen(false)}>{t({ en: "Cancel", zh: "取消" })}</button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <label className="grid gap-1.5">
                        <span className="villa-label">{t({ en: "Name", zh: "名字" })}</span>
                        <input className="villa-input" value={quickPet.name} onChange={(event) => setQuickPet((current) => ({ ...current, name: event.target.value }))} placeholder="Mochi" />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="villa-label">{t({ en: "Breed", zh: "品种" })}</span>
                        <input className="villa-input" value={quickPet.breed} onChange={(event) => setQuickPet((current) => ({ ...current, breed: event.target.value }))} placeholder="Poodle" />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="villa-label">{t({ en: "Weight", zh: "体重" })}</span>
                        <input className="villa-input" type="number" min="1" max="12" step="0.1" value={quickPet.weight.replace(/kg/gi, "")} onChange={(event) => setQuickPet((current) => ({ ...current, weight: event.target.value }))} placeholder="5" />
                      </label>
                    </div>
                    {quickPetError ? <p className="m-0 mt-2 rounded-[14px] bg-red-50 p-2 text-xs font-black text-red-700">{quickPetError}</p> : null}
                    <button type="submit" className="booking-primary mt-3" disabled={savingQuickPet}>
                      {savingQuickPet ? t({ en: "Saving...", zh: "保存中..." }) : t({ en: "Save & Select Pet", zh: "保存并选择宠物" })}
                    </button>
                  </form>
                ) : null}

                <label className="mt-3 grid gap-2">
                  <span className="villa-label">{t({ en: "Special Request (Optional)", zh: "特别要求（选填）" })}</span>
                  <textarea
                    className="villa-input h-16 py-3"
                    value={specialRequest}
                    onChange={(event) => setSpecialRequest(event.target.value)}
                    placeholder={t({ en: "Tell us anything important for your pet's comfort.", zh: "告诉我们宠物照顾上需要注意的事项。" })}
                  />
                </label>
                <label id="booking-whatsapp-consent" className="mt-3 flex cursor-pointer items-start gap-3 rounded-[16px] border border-villa-primary-light bg-white p-3 text-left">
                  <input
                    type="checkbox"
                    checked={operationalWhatsAppConsent}
                    onChange={(event) => {
                      setOperationalWhatsAppConsent(event.target.checked);
                      if (event.target.checked) setBookingDataMessage("");
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-villa-primary"
                  />
                  <span className="text-xs font-bold leading-relaxed text-villa-text-secondary">
                    {t({
                      en: "I agree to receive essential booking, payment and pet-care service updates from The Pet Villa via WhatsApp. No marketing messages will be sent.",
                      zh: "我同意通过 WhatsApp 接收 The Pet Villa 必要的预订、付款及宠物照护服务通知。我们不会发送营销信息。"
                    })}
                  </span>
                </label>
              </section>

              <section className="booking-mobile-summary booking-checkout-panel">
                <div className="booking-checkout-topline">
                  <div className="booking-checkout-topline-row">
                    <span>{t({ en: "Secure checkout", zh: "安全确认" })}</span>
                    <div className="booking-checkout-badges">
                      <strong>{dateTouched && selectedPets.length > 0 ? t({ en: "Ready", zh: "可付款" }) : !dateTouched ? t({ en: "Needs date", zh: "需选日期" }) : t({ en: "Needs pet", zh: "需选宠物" })}</strong>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-[11px] font-black uppercase text-[#8d65da]">{t({ en: "Review & Pay", zh: "确认付款" })}</p>
                    <h2 className="m-0 mt-1 font-title text-[22px] font-black leading-tight text-villa-text-primary">{selectedServiceTitle}</h2>
                    <p className="m-0 mt-1 text-xs font-bold leading-snug text-villa-text-secondary">{displayDateLabel} · {selectedPetNames.length ? selectedPetNames.join(", ") : t({ en: "Choose pet", zh: "选择宠物" })}</p>
                  </div>
                  <div className="booking-deposit-bubble">
                    <span className="block text-[11px] font-black text-villa-text-secondary">{depositLabel}</span>
                    <strong className="block text-[24px] font-black leading-none text-[#d97867]">{pricingAmount(deposit)}</strong>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="booking-quick-total">
                    <span>{t({ en: "Total", zh: "总计" })}</span>
                    <strong>{pricingAmount(total)}</strong>
                  </div>
                  <div className="booking-quick-total">
                    <span>{t({ en: "Pets", zh: "宠物" })}</span>
                    <strong>{selectedPets.length}</strong>
                  </div>
                  <div className="booking-quick-total">
                    <span>{t({ en: "Later", zh: "尾款" })}</span>
                    <strong>{pricingAmount(balance)}</strong>
                  </div>
                </div>
                {offDayIssue ? (
                  <p className="mb-0 mt-3 rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-700">
                    {t({ en: "One of the selected dates is full. Please choose another date.", zh: "所选日期已满，请重新选择其他日期。" })}
                  </p>
                ) : null}
                {selectedPets.length === 0 && pets.length > 0 ? (
                  <p className="booking-pay-hint">
                    {t({ en: "Choose at least one pet before payment.", zh: "请先选择至少一只宠物，才可以继续付款。" })}
                  </p>
                ) : null}
                {pets.length === 0 ? (
                  <button type="button" className="booking-primary mt-3" onClick={() => setQuickPetOpen(true)}>{t({ en: "Add Pet Here", zh: "在这里新增宠物" })}</button>
                ) : (
                  <button type="button" onClick={saveDraftForPayment} disabled={dateTouched && selectedPets.length > 0 && !confirmCompleted} className="booking-primary mt-3">{t({ en: "Continue to Payment", zh: "继续付款" })}</button>
                )}
              </section>
            </div>

            <aside className="booking-summary-card hidden lg:block">
              <h2 className="booking-panel-title">{t({ en: "Booking Summary", zh: "预约摘要" })}</h2>
              <div className="mt-4 rounded-[24px] bg-[#f2e7ff] p-4 shadow-[inset_0_-8px_14px_rgba(255,255,255,0.26)]">
                <div className="grid gap-3 text-sm font-black text-villa-text-primary">
                  <div className="flex items-center gap-3">
                    <ServiceIcon type={service} />
                    <span>{service === "overnight" ? t({ en: "Overnight Boarding", zh: "过夜寄宿" }) : t({ en: "Daycare", zh: "日托" })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon />
                    <span>{displayDateLabel}{dateTouched && service === "overnight" ? ` (${overnightNights} ${t({ en: "Nights", zh: "晚" })})` : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DogAvatar pet={selectedPetObjects[0]} />
                    <span>{selectedPetNames.length ? selectedPetNames.join(", ") : t({ en: "No pet selected", zh: "未选择宠物" })}</span>
                  </div>
                  <div className="text-xs font-bold text-villa-text-secondary">{selectedPets.length} {selectedPets.length === 1 ? t({ en: "Pet", zh: "只宠物" }) : t({ en: "Pets", zh: "只宠物" })}</div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex justify-between text-sm font-bold text-villa-text-secondary">
                  <span>{t({ en: "Subtotal", zh: "小计" })}</span>
                  <span>{pricingAmount(subtotal)}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-base font-black text-villa-text-primary">{t({ en: "Total", zh: "总计" })}</span>
                  <span className="text-2xl font-black text-villa-text-primary">{pricingAmount(total)}</span>
                </div>
                <div className="flex justify-between text-sm font-black">
                  <span className="text-villa-text-secondary">{depositLabel}</span>
                  <span className="text-villa-primary">{pricingAmount(deposit)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-villa-text-secondary">
                  <span>{t({ en: "Balance Later", zh: "尾款稍后支付" })}</span>
                  <span>{pricingAmount(balance)}</span>
                </div>
              </div>
              <div className="my-4 h-px bg-villa-primary-light" />
              {offDayIssue ? (
                <p className="mb-3 rounded-[14px] bg-red-50 p-3 text-xs font-black text-red-700">
                  {t({ en: "One of the selected dates is full. Please choose another date.", zh: "所选日期已满，请重新选择其他日期。" })}
                </p>
              ) : null}
              {pets.length === 0 ? (
                <a href="/pets?mode=add" className="booking-primary">{t({ en: "Add Pet Profile", zh: "新增宠物资料" })}</a>
              ) : (
                <button type="button" onClick={saveDraftForPayment} disabled={dateTouched && selectedPets.length > 0 && !confirmCompleted} className="booking-primary">{t({ en: "Continue to Payment", zh: "继续付款" })}</button>
              )}
              <p className="mt-3 text-center text-[11px] font-bold leading-relaxed text-villa-text-muted">{t({ en: "Your booking is only confirmed after deposit payment.", zh: "付款订金后，预约才会确认。" })}</p>
            </aside>
          </div>
          {paymentPromptKind ? (
            <div className="booking-payment-prompt" role="dialog" aria-live="polite" aria-label={paymentPromptKind === "date" ? t({ en: "Pick a date first", zh: "请先选择日期" }) : t({ en: "Choose a pet first", zh: "请先选择宠物" })}>
              <div className="booking-payment-prompt-icon">
                {paymentPromptKind === "date" ? <CalendarIcon /> : <DogAvatar />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[11px] font-black uppercase text-[#8d65da]">{t({ en: "Almost ready", zh: "差一点就完成" })}</p>
                <h3 className="m-0 mt-1 font-title text-[20px] font-black leading-tight text-villa-text-primary">
                  {paymentPromptKind === "date" ? t({ en: "Pick your date first", zh: "请先选择日期" }) : t({ en: "Choose your pet first", zh: "请先选择宠物" })}
                </h3>
                <p className="m-0 mt-1 text-xs font-bold leading-snug text-villa-text-secondary">
                  {paymentPromptKind === "date"
                    ? t({ en: "Tap a calendar date, then continue to payment.", zh: "点击日历日期后，就可以继续付款。" })
                    : t({ en: "Tap one pet card above, then continue to payment.", zh: "点击上方宠物卡片后，就可以继续付款。" })}
                </p>
              </div>
              <button
                type="button"
                className="booking-payment-prompt-action"
                onClick={() => {
                  const nextTarget = paymentPromptKind === "date" ? "booking-choose-date" : "booking-choose-pets";
                  setPaymentPromptKind(null);
                  document.getElementById(nextTarget)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                {paymentPromptKind === "date" ? t({ en: "Pick", zh: "去选日期" }) : t({ en: "Choose", zh: "去选择" })}
              </button>
            </div>
          ) : null}
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
