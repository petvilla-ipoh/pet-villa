"use client";

import { useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { useLanguage } from "../components/LanguageProvider";

type AmountMode = "deposit" | "full";
type Method = "duitnow" | "fpx" | "tng" | "grabpay" | "card";

export default function PaymentPage() {
  const { t } = useLanguage();
  const [amountMode, setAmountMode] = useState<AmountMode>("deposit");
  const [method, setMethod] = useState<Method>("duitnow");
  const total = 120;
  const amount = amountMode === "deposit" ? total / 2 : total;
  const balance = total - amount;

  const buttonText = useMemo(() => {
    if (amountMode === "deposit") return t({ en: "Pay RM60 Deposit", zh: "支付 RM60 订金" });
    return t({ en: "Pay RM120 in Full", zh: "支付 RM120 全款" });
  }, [amountMode, t]);

  return (
    <OwnerSidebar>
      <section className="p-5 sm:p-8 lg:p-10">
        <div className="villa-card flex flex-wrap items-center justify-between gap-4 bg-villa-peach/35 p-5">
          <div>
            <p className="m-0 text-sm font-black uppercase text-villa-text/55">{t({ en: "Booking Summary", zh: "预约摘要" })}</p>
            <h1 className="font-title text-3xl font-black">Mochi · Overnight · Jun 4-7</h1>
          </div>
          <div className="rounded-pill bg-white px-5 py-3 font-black">Total RM{total}</div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="grid gap-6">
            <section className="villa-card p-6">
              <h2 className="font-title text-3xl font-black">{t({ en: "Choose Payment Amount", zh: "选择付款金额" })}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <button type="button" onClick={() => setAmountMode("deposit")} className={`rounded-villa border p-5 text-left ${amountMode === "deposit" ? "border-villa-coral bg-villa-peach/40" : "border-villa-line bg-white/70"}`}>
                  <span className="rounded-pill bg-villa-coral px-3 py-1 text-xs font-black">{t({ en: "Recommended", zh: "推荐" })}</span>
                  <h3 className="mt-4 font-title text-3xl font-black">Pay Deposit 50%</h3>
                  <p className="m-0 font-bold text-villa-text/60">RM60 now · RM60 later</p>
                </button>
                <button type="button" onClick={() => setAmountMode("full")} className={`rounded-villa border p-5 text-left ${amountMode === "full" ? "border-villa-coral bg-villa-peach/40" : "border-villa-line bg-white/70"}`}>
                  <h3 className="font-title text-3xl font-black">Pay in Full 100%</h3>
                  <p className="m-0 font-bold text-villa-text/60">RM120 today · RM0 balance</p>
                </button>
              </div>
            </section>

            <section className="villa-card p-6">
              <h2 className="font-title text-3xl font-black">{t({ en: "Payment Method", zh: "付款方式" })}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {[
                  ["duitnow", "DuitNow QR"],
                  ["fpx", "FPX"],
                  ["tng", "TNG"],
                  ["grabpay", "GrabPay"],
                  ["card", "Credit Card"]
                ].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setMethod(id as Method)} className={`rounded-[18px] border p-4 text-sm font-black ${method === id ? "border-villa-coral bg-villa-peach" : "border-villa-line bg-white/70"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-villa border border-villa-line bg-white/65 p-5">
                {method === "duitnow" ? <div className="grid min-h-[210px] place-items-center rounded-[20px] border-2 border-dashed border-villa-coral/50 bg-villa-bg font-black">DuitNow QR Placeholder</div> : null}
                {method === "fpx" ? (
                  <label className="grid gap-2">
                    <span className="villa-label">{t({ en: "Select Bank", zh: "选择银行" })}</span>
                    <select className="villa-input"><option>Maybank2u</option><option>CIMB Clicks</option><option>Public Bank</option></select>
                  </label>
                ) : null}
                {method === "tng" ? <p className="font-bold text-villa-text/65">Touch'n Go payment will open in the next step.</p> : null}
                {method === "grabpay" ? <p className="font-bold text-villa-text/65">GrabPay checkout will open securely.</p> : null}
                {method === "card" ? (
                  <div className="grid gap-4">
                    <input className="villa-input" placeholder="Card number" />
                    <div className="grid gap-4 md:grid-cols-2"><input className="villa-input" placeholder="MM/YY" /><input className="villa-input" placeholder="CVC" /></div>
                  </div>
                ) : null}
              </div>
            </section>
          </main>

          <aside className="villa-card h-fit p-6 lg:sticky lg:top-28">
            <h2 className="font-title text-3xl font-black">{t({ en: "Payment Details", zh: "付款明细" })}</h2>
            <div className="mt-5 grid gap-3 font-black text-villa-text/65">
              <div className="flex justify-between"><span>Total</span><span>RM{total}</span></div>
              <div className="flex justify-between"><span>{amountMode === "deposit" ? "Deposit" : "Pay today"}</span><span>RM{amount}</span></div>
              <div className="flex justify-between"><span>Balance</span><span>RM{balance}</span></div>
            </div>
            <p className="mt-5 rounded-[18px] bg-villa-bg p-4 text-sm font-bold text-villa-text/60">
              {t({ en: "Remaining balance can be paid later from My Orders.", zh: "余款可之后在“我的订单”页面支付。" })}
            </p>
            <div className="mt-5 rounded-pill bg-white px-4 py-3 text-center text-sm font-black">🔒 SSL Secure Payment</div>
            <button type="button" className="villa-button mt-5 w-full">{buttonText}</button>
          </aside>
        </div>
      </section>
    </OwnerSidebar>
  );
}
