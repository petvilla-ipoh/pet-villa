"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { PaymentLogo, paymentMethods, type PaymentMethodId } from "../components/PaymentLogo";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { createOrderFromDraft, readBookingDraft, type BookingDraft } from "../lib/orderFlow";

type AmountMode = "deposit" | "full";

const fallbackDraft: BookingDraft = {
  id: "fallback",
  service: "overnight",
  serviceLabel: "Overnight Boarding",
  dateLabel: "Jun 4 - Jun 7",
  nights: 3,
  hours: 0,
  pets: [{ id: "pet-fallback", name: "Mochi", breed: "Toy Poodle", weight: "6.2kg" }],
  total: 120,
  deposit: 60,
  balance: 60,
  specialRequest: "",
  createdAt: new Date().toISOString()
};

function CalendarIcon() {
  return (
    <svg viewBox="0 0 40 40" className="h-5 w-5" aria-hidden="true">
      <rect x="7" y="9" width="26" height="25" rx="5" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.5" />
      <path d="M7 17h26M14 6v7M26 6v7" stroke="#e8927c" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DogIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
      <circle cx="24" cy="25" r="14" fill="#f5c4b3" />
      <path d="M12 22c-5 2-6 9-3 13 3 4 9 3 11-1M36 22c5 2 6 9 3 13-3 4-9 3-11-1" fill="#c7824f" />
      <circle cx="19" cy="25" r="2" fill="#3d1f0d" />
      <circle cx="29" cy="25" r="2" fill="#3d1f0d" />
      <ellipse cx="24" cy="31" rx="4" ry="3" fill="#3d1f0d" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 40 40" className="h-5 w-5" aria-hidden="true">
      <path d="M27 30A13 13 0 0 1 17 8a15 15 0 1 0 18 18 13 13 0 0 1-8 4Z" fill="#ffd45b" stroke="#d9922e" strokeWidth="2.5" />
    </svg>
  );
}

export default function PaymentPage() {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [amountMode, setAmountMode] = useState<AmountMode>("deposit");
  const [method, setMethod] = useState<PaymentMethodId>("duitnow");
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(readBookingDraft());
    setLoaded(true);
  }, []);

  const booking = draft || fallbackDraft;
  const total = booking.total;
  const amount = amountMode === "deposit" ? booking.deposit : total;
  const balance = Math.max(0, total - amount);
  const petNames = booking.pets.map((pet) => pet.name).join(", ");
  const stayLabel = booking.service === "overnight"
    ? t({ en: `${booking.nights} Nights Stay`, zh: `${booking.nights} 晚寄宿` })
    : t({ en: `${booking.hours} Hours Daycare`, zh: `${booking.hours} 小时日托` });

  const buttonText = useMemo(() => {
    if (method === "duitnow") return t({ en: "I Have Paid", zh: "我已付款" });
    return amountMode === "deposit"
      ? t({ en: `Pay RM${amount} Deposit`, zh: `支付 RM${amount} 订金` })
      : t({ en: `Pay RM${amount} in Full`, zh: `支付 RM${amount} 全款` });
  }, [amount, amountMode, method, t]);

  function confirmPayment() {
    if (!draft) {
      setMessage(t({ en: "Please create a booking first before payment.", zh: "请先创建预约再付款。" }));
      return;
    }
    const order = createOrderFromDraft(draft, amount);
    setMessage(t({ en: "Payment recorded. Redirecting to My Orders...", zh: "付款已记录，正在前往我的订单..." }));
    window.setTimeout(() => {
      window.location.href = `/orders?order=${order.orderId}`;
    }, 600);
  }

  if (loaded && !draft) {
    return (
      <ProtectedPage>
        <OwnerSidebar>
          <section className="p-4 lg:p-8">
            <div className="villa-card text-center">
              <h1 className="section-title">{t({ en: "No booking ready for payment", zh: "还没有可付款的预约" })}</h1>
              <p className="body-copy mt-2">{t({ en: "Please create a booking first, then continue to payment.", zh: "请先创建预约，再继续付款。" })}</p>
              <a href="/booking" className="villa-button mt-4 w-full">{t({ en: "Book a Stay", zh: "立即预约" })}</a>
            </div>
          </section>
        </OwnerSidebar>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <div className="rounded-[20px] border border-villa-primary-light bg-villa-primary-bg/80 p-4 shadow-[0_4px_16px_rgba(61,31,13,0.08)]">
            <p className="m-0 text-xs font-black uppercase tracking-[0.08em] text-villa-primary">{t({ en: "Booking Summary", zh: "预约摘要" })}</p>
            <div className="mt-3 grid gap-2 text-sm font-black text-villa-text-primary">
              <div className="flex items-center gap-2"><DogIcon /> {petNames}</div>
              <div className="flex items-center gap-2"><MoonIcon /> {booking.serviceLabel}</div>
              <div className="flex items-center gap-2"><CalendarIcon /> {booking.dateLabel}</div>
              <div className="rounded-full bg-white px-3 py-2 text-xs font-black text-villa-text-secondary">{stayLabel}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <main className="grid gap-5">
              <section className="villa-card">
                <h1 className="section-title">{t({ en: "Payment Amount", zh: "付款金额" })}</h1>
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => setAmountMode("deposit")}
                    className={`rounded-[18px] border p-4 text-left transition-all duration-200 ${
                      amountMode === "deposit" ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white"
                    }`}
                  >
                    <span className="rounded-pill bg-villa-primary px-3 py-1 text-xs font-bold text-white">{t({ en: "Recommended", zh: "推荐" })}</span>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="card-title">{t({ en: "Pay Deposit 50%", zh: "支付 50% 订金" })}</h2>
                        <p className="muted-copy m-0">{t({ en: `Today: RM${booking.deposit} · Later: RM${booking.balance}`, zh: `今天：RM${booking.deposit} · 之后：RM${booking.balance}` })}</p>
                      </div>
                      <span className={`grid h-7 w-7 place-items-center rounded-full ${amountMode === "deposit" ? "bg-villa-primary text-white" : "border border-villa-primary-light text-transparent"}`}>✓</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountMode("full")}
                    className={`rounded-[18px] border p-4 text-left transition-all duration-200 ${
                      amountMode === "full" ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="card-title">{t({ en: "Pay Full 100%", zh: "支付 100% 全款" })}</h2>
                        <p className="muted-copy m-0">{t({ en: `Today: RM${total} · No balance later`, zh: `今天：RM${total} · 无尾款` })}</p>
                      </div>
                      <span className={`grid h-7 w-7 place-items-center rounded-full ${amountMode === "full" ? "bg-villa-primary text-white" : "border border-villa-primary-light text-transparent"}`}>✓</span>
                    </div>
                  </button>
                </div>
              </section>

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Recommended Payment", zh: "推荐付款方式" })}</h2>
                <div className="mt-4 grid gap-3">
                  <PaymentLogo method={paymentMethods[0]} selected={method === "duitnow"} onClick={() => setMethod("duitnow")} />
                  <div className="rounded-[18px] border border-villa-primary-light bg-white">
                    <button
                      type="button"
                      onClick={() => setMethodsOpen((value) => !value)}
                      className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-black text-villa-text-primary"
                    >
                      {t({ en: "Other Methods", zh: "其他付款方式" })}
                      <span>{methodsOpen ? "⌃" : "⌄"}</span>
                    </button>
                    {methodsOpen ? (
                      <div className="grid gap-3 border-t border-villa-primary-light p-3">
                        {paymentMethods.slice(1).map((item) => (
                          <PaymentLogo key={item.id} method={item} selected={method === item.id} onClick={() => setMethod(item.id)} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-[20px] border border-villa-primary-light bg-villa-primary-bg p-4">
                  {method === "duitnow" ? (
                    <div className="text-center">
                      <div className="mb-4 rounded-[18px] border border-villa-primary-light bg-white p-4">
                        <img src="/logo.png" alt="Pet Villa" className="mx-auto h-14 w-28 object-contain" />
                        <p className="m-0 mt-2 text-xs font-black uppercase text-villa-text-primary">Pet Villa Sdn Bhd</p>
                      </div>
                      <h3 className="card-title">{t({ en: "Scan To Pay", zh: "扫码付款" })}</h3>
                      <p className="mt-1 text-xs font-bold text-villa-text-secondary">DuitNow QR · Scan & Pay</p>
                      <div className="mx-auto mt-4 flex h-56 w-52 max-w-full flex-col items-center justify-center rounded-[20px] bg-[#e91e63] p-4 shadow-md">
                        <img src="/assets/payment/duitnow.svg" alt="DuitNow QR" className="mb-2 h-10 w-28 object-contain rounded-[10px] bg-white px-2" />
                        <div className="grid h-full w-full place-items-center rounded-[12px] bg-white">
                          <div className="h-32 w-32 bg-[repeating-linear-gradient(45deg,#e91e63_0_6px,#ffffff_6px_12px)]" />
                        </div>
                      </div>
                      <p className="mt-4 text-xs font-black uppercase text-villa-primary">Pet Villa Sdn Bhd</p>
                      <div className="mt-4 rounded-[16px] bg-white p-3">
                        <p className="m-0 text-xs font-bold text-villa-text-secondary">{t({ en: "Amount To Pay", zh: "需付款金额" })}</p>
                        <p className="m-0 text-[28px] font-black text-villa-primary">RM{amount}</p>
                        <p className="m-0 text-xs font-bold text-villa-text-muted">{amountMode === "deposit" ? t({ en: "Deposit", zh: "订金" }) : t({ en: "Full payment", zh: "全款" })}</p>
                      </div>
                    </div>
                  ) : null}
                  {method === "fpx" ? (
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "Select Bank", zh: "选择银行" })}</span>
                      <select className="villa-input">
                        <option>Maybank2u</option>
                        <option>CIMB Clicks</option>
                        <option>RHB Now</option>
                        <option>Public Bank</option>
                      </select>
                    </label>
                  ) : null}
                  {method === "tng" ? <p className="body-copy m-0">Touch 'n Go eWallet checkout will open securely.</p> : null}
                  {method === "grabpay" ? <p className="body-copy m-0">GrabPay checkout will open securely.</p> : null}
                  {method === "card" ? (
                    <div className="grid gap-3">
                      <input className="villa-input" placeholder={t({ en: "Card number", zh: "银行卡号" })} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className="villa-input" placeholder="MM/YY" />
                        <input className="villa-input" placeholder="CVC" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </main>

            <aside className="villa-card h-fit lg:sticky lg:top-24">
              <h2 className="section-title">{t({ en: "Payment Details", zh: "付款明细" })}</h2>
              <div className="mt-4 rounded-[18px] border border-villa-primary-light bg-white p-4">
                <div className="flex justify-between text-sm font-bold text-villa-text-secondary">
                  <span>{t({ en: "Booking Total", zh: "预约总额" })}</span>
                  <span className="text-lg font-black text-villa-text-primary">RM{total}</span>
                </div>
                <div className="my-4 border-t border-dashed border-villa-primary-light" />
                <div className="flex justify-between text-sm font-bold text-villa-text-secondary">
                  <span>{t({ en: "Pay Today", zh: "今天付款" })}</span>
                  <span className="text-xl font-black text-villa-primary">RM{amount}</span>
                </div>
                <div className="my-4 border-t border-dashed border-villa-primary-light" />
                <div className="flex justify-between text-sm font-bold text-villa-text-secondary">
                  <span>{t({ en: "Balance Later", zh: "稍后尾款" })}</span>
                  <span className="text-lg font-black text-villa-text-primary">RM{balance}</span>
                </div>
              </div>
              <p className="mt-4 rounded-[16px] bg-villa-primary-bg p-3 text-xs font-semibold text-villa-text-secondary">
                {t({ en: "Remaining balance can be paid later from My Orders.", zh: "余款可之后在我的订单页面支付。" })}
              </p>
              <div className="mt-4 rounded-pill bg-white px-4 py-3 text-center text-xs font-bold shadow-sm">SSL Secure Payment</div>
              {message ? <p className="mt-3 rounded-[14px] bg-villa-primary-bg p-3 text-xs font-bold text-villa-primary">{message}</p> : null}
              <button type="button" onClick={confirmPayment} className="villa-button mt-4 w-full">
                {buttonText}
              </button>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
