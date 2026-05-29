"use client";

import { useMemo, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { PaymentLogo, paymentMethods, type PaymentMethodId } from "../components/PaymentLogo";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";

type AmountMode = "deposit" | "full";

export default function PaymentPage() {
  const { t } = useLanguage();
  const [amountMode, setAmountMode] = useState<AmountMode>("deposit");
  const [method, setMethod] = useState<PaymentMethodId>("duitnow");
  const total = 120;
  const amount = amountMode === "deposit" ? total / 2 : total;
  const balance = total - amount;

  const buttonText = useMemo(() => {
    return amountMode === "deposit"
      ? t({ en: "Pay RM60 Deposit", zh: "支付 RM60 订金" })
      : t({ en: "Pay RM120 in Full", zh: "支付 RM120 全款" });
  }, [amountMode, t]);

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-4 lg:p-8">
          <div className="villa-card bg-villa-primary-bg">
            <p className="muted-copy m-0 uppercase">{t({ en: "Booking Summary", zh: "预约摘要" })}</p>
            <h1 className="card-title mt-1">Mochi · Overnight · Jun 4-7</h1>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <main className="grid gap-6">
              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Payment Amount", zh: "付款金额" })}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setAmountMode("deposit")} className={`rounded-[20px] border p-4 text-left transition ${amountMode === "deposit" ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white"}`}>
                    <span className="rounded-pill bg-villa-primary px-3 py-1 text-xs font-bold">{t({ en: "Recommended", zh: "推荐" })}</span>
                    <h3 className="card-title mt-3">Pay Deposit 50%</h3>
                    <p className="muted-copy m-0">RM60 now · RM60 later</p>
                  </button>
                  <button type="button" onClick={() => setAmountMode("full")} className={`rounded-[20px] border p-4 text-left transition ${amountMode === "full" ? "border-villa-primary bg-villa-primary-bg shadow-md" : "border-villa-primary-light bg-white"}`}>
                    <h3 className="card-title">Pay in Full 100%</h3>
                    <p className="muted-copy m-0">RM120 today · RM0 balance</p>
                  </button>
                </div>
              </section>

              <section className="villa-card">
                <h2 className="section-title">{t({ en: "Payment Method", zh: "付款方式" })}</h2>
                <div className="mt-4 grid gap-3">
                  {paymentMethods.map((item) => (
                    <PaymentLogo key={item.id} method={item} selected={method === item.id} onClick={() => setMethod(item.id)} />
                  ))}
                </div>

                <div className="mt-4 rounded-[20px] border border-villa-primary-light bg-villa-primary-bg p-4">
                  {method === "duitnow" ? <div className="grid min-h-[190px] place-items-center rounded-[16px] border-2 border-dashed border-villa-primary bg-white text-sm font-bold">DuitNow QR Placeholder 🇲🇾</div> : null}
                  {method === "fpx" ? (
                    <label className="grid gap-2">
                      <span className="villa-label">{t({ en: "Select Bank", zh: "选择银行" })}</span>
                      <select className="villa-input"><option>Maybank2u</option><option>CIMB Clicks</option><option>Public Bank</option></select>
                    </label>
                  ) : null}
                  {method === "tng" ? <p className="body-copy m-0">Touch 'n Go eWallet checkout will open securely.</p> : null}
                  {method === "grabpay" ? <p className="body-copy m-0">GrabPay checkout will open securely.</p> : null}
                  {method === "visa" || method === "mastercard" ? (
                    <div className="grid gap-3">
                      <input className="villa-input" placeholder="Card number" />
                      <div className="grid gap-3 sm:grid-cols-2"><input className="villa-input" placeholder="MM/YY" /><input className="villa-input" placeholder="CVC" /></div>
                    </div>
                  ) : null}
                </div>
              </section>
            </main>

            <aside className="villa-card h-fit lg:sticky lg:top-24">
              <h2 className="section-title">{t({ en: "Details", zh: "明细" })}</h2>
              <div className="mt-4 grid gap-3 text-sm font-bold text-villa-text-secondary">
                <div className="flex justify-between"><span>Total</span><span>RM{total}</span></div>
                <div className="flex justify-between"><span>{amountMode === "deposit" ? "Deposit" : "Pay today"}</span><span>RM{amount}</span></div>
                <div className="flex justify-between"><span>Balance</span><span>RM{balance}</span></div>
              </div>
              <p className="mt-4 rounded-[16px] bg-villa-primary-bg p-3 text-xs font-semibold text-villa-text-secondary">
                {t({ en: "Remaining balance can be paid later from My Orders.", zh: "余款可之后在“我的订单”页面支付。" })}
              </p>
              <div className="mt-4 rounded-pill bg-white px-4 py-3 text-center text-xs font-bold shadow-sm">🔒 SSL Secure Payment</div>
              <button type="button" className="villa-button mt-4 w-full">{buttonText}</button>
            </aside>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
