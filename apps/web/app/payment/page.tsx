"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { PaymentLogo, paymentMethods, type PaymentMethodId } from "../components/PaymentLogo";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { ensureOrderFromDraft, loadBookingDraft, loadOrders, submitCustomerPayment, type BookingDraft, type VillaOrder } from "../lib/orderFlow";
import { dogAvatarSrc } from "../lib/petProfiles";
import { DEFAULT_BUSINESS_SETTINGS, loadBusinessSettings, type BusinessSettings } from "../lib/businessSettings";

type AmountMode = "deposit" | "full";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 40 40" className="h-5 w-5" aria-hidden="true">
      <rect x="7" y="9" width="26" height="25" rx="5" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.5" />
      <path d="M7 17h26M14 6v7M26 6v7" stroke="#e8927c" strokeWidth="2.5" strokeLinecap="round" />
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

function ShieldIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <path d="M24 6 39 12v11c0 9.5-5.7 15.8-15 19-9.3-3.2-15-9.5-15-19V12l15-6Z" fill="#e9f9e7" stroke="#7fbc8b" strokeWidth="2.8" />
      <path d="m17 25 5 5 10-12" fill="none" stroke="#8d65da" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <rect x="7" y="13" width="34" height="25" rx="9" fill="#fff4df" stroke="#d9ad46" strokeWidth="2.6" />
      <path d="M13 13c2.8-4 8.8-5.5 16-4l8 2.2" fill="none" stroke="#e8927c" strokeWidth="2.8" strokeLinecap="round" />
      <rect x="28" y="21" width="13" height="10" rx="4" fill="#ffffff" stroke="#d9ad46" strokeWidth="2.4" />
      <circle cx="33" cy="26" r="1.8" fill="#8d65da" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="#dff6e5" stroke="#65b879" strokeWidth="2.5" />
      <path d="M17 32l1.2-4.1A9 9 0 1 1 21 30.7L17 32Z" fill="#fff" stroke="#36a852" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20.5 20.8c.5 3.4 3.2 6.1 6.7 6.8l1.8-2.1" fill="none" stroke="#36a852" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function formatOrderId(orderId: string) {
  return orderId.replace(/^order-/, "PV-");
}

export default function PaymentPage() {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [amountMode, setAmountMode] = useState<AmountMode>("deposit");
  const [method, setMethod] = useState<PaymentMethodId>("qr");
  const [submittedOrder, setSubmittedOrder] = useState<VillaOrder | null>(null);
  const [message, setMessage] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [paymentContext, setPaymentContext] = useState<"booking" | "balance">("booking");
  const paymentRequestRef = useRef<{ scope: string; key: string } | null>(null);

  useEffect(() => {
    document.body.dataset.petVillaSurface = "payment";
    return () => {
      delete document.body.dataset.petVillaSurface;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadDraft() {
      try {
        const params = new URLSearchParams(window.location.search);
        const balanceOrderId = params.get("mode") === "balance" ? params.get("order") : "";
        const nextDraft = balanceOrderId
          ? (await loadOrders()).find((order) => order.orderId === balanceOrderId && order.balance > 0 && !["cancelled", "completed"].includes(order.status)) || null
          : await loadBookingDraft();
        if (!active) return;
        setDraft(nextDraft);
        setPaymentContext(balanceOrderId ? "balance" : "booking");
        setAmountMode(balanceOrderId ? "full" : nextDraft?.deposit ? "deposit" : "full");
        setLoadError(nextDraft ? "" : balanceOrderId ? t({ en: "This balance is no longer available for payment.", zh: "这笔尾款目前无法付款。" }) : "");
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : t({ en: "Payment details could not be loaded.", zh: "无法读取付款资料。" }));
      } finally {
        if (active) setLoaded(true);
      }
    }
    void loadDraft();
    void loadBusinessSettings().then((settings) => {
      if (active) setBusinessSettings(settings);
    }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : t({ en: "Payment settings could not be loaded.", zh: "无法读取付款设定。" }));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!submittedOrder) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [submittedOrder]);

  const booking = draft;
  const total = booking?.total || 0;
  const subtotal = booking?.subtotal ?? total;
  const voucherDiscount = booking?.voucherDiscount || 0;
  const hasDeposit = Boolean(booking && booking.deposit > 0);
  const amount = booking ? (paymentContext === "balance" ? booking.balance : amountMode === "deposit" && hasDeposit ? booking.deposit : total) : 0;
  const balance = paymentContext === "balance" ? 0 : Math.max(0, total - amount);
  const petNames = booking?.pets.map((pet) => pet.name).join(", ") || "";
  const selectedMethod = paymentMethods.find((item) => item.id === method) || paymentMethods[0];
  const stayLabel = !booking ? "" : booking.service === "overnight"
    ? t({ en: `${booking.nights} Nights Stay`, zh: `${booking.nights} 晚寄宿` })
    : t({ en: `${booking.hours} Hours Daycare`, zh: `${booking.hours} 小时日托` });

  const buttonText = useMemo(() => {
    return t({ en: "I Have Paid", zh: "我已付款" });
  }, [t]);

  async function confirmPayment() {
    if (!draft) {
      setMessage(t({ en: "Please create a booking first before payment.", zh: "请先创建预约再付款。" }));
      return;
    }

    if (paymentSubmitting) return;
    if (amount <= 0) {
      setMessage(t({ en: "The payment amount must be greater than RM0.", zh: "付款金额必须高于 RM0。" }));
      return;
    }
    setPaymentSubmitting(true);
    try {
      const order = paymentContext === "balance"
        ? draft as VillaOrder
        : await ensureOrderFromDraft(draft);
      const scope = `${order.orderRowId || order.orderId}:${amount}:${method}`;
      if (!paymentRequestRef.current || paymentRequestRef.current.scope !== scope) {
        paymentRequestRef.current = { scope, key: crypto.randomUUID() };
      }
      const nextOrders = await submitCustomerPayment(order, amount, method, paymentRequestRef.current.key);
      setSubmittedOrder(nextOrders.find((item) => item.orderId === order.orderId) || {
        ...order,
        status: "pending_verification",
        paymentSubmission: { amount, method, submittedAt: new Date().toISOString() }
      });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t({ en: "Could not start payment.", zh: "无法开始付款。" }));
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <ProtectedPage>
        <OwnerSidebar>
          <section className="payment-page">
            <div className="payment-empty-card text-center">
              <h1 className="section-title">{t({ en: "Loading payment...", zh: "正在载入付款资料..." })}</h1>
            </div>
          </section>
        </OwnerSidebar>
      </ProtectedPage>
    );
  }

  if (!draft) {
    return (
      <ProtectedPage>
        <OwnerSidebar>
          <section className="payment-page">
            <div className="payment-empty-card text-center">
              <span className="payment-empty-icon"><WalletIcon /></span>
              <h1 className="section-title">{loadError || t({ en: "No booking ready for payment", zh: "还没有可付款的预约" })}</h1>
              <p className="body-copy mt-2">{loadError
                ? t({ en: "Your booking was not replaced with an empty payment. Return to Booking and try again.", zh: "预约资料没有被空白付款页取代，请返回预约页重试。" })
                : t({ en: "Please create a booking first, then continue to payment.", zh: "请先创建预约，再继续付款。" })}</p>
              <a href="/booking" className="payment-primary mt-5 w-full">{t({ en: "Book a Stay", zh: "立即预约" })}</a>
            </div>
          </section>
        </OwnerSidebar>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="payment-page payment-page-compact">
          <header className="payment-checkout-hero payment-thankyou-hero">
            <img src="/petvilla-payment-thankyou-banner.webp" alt="" aria-hidden="true" className="payment-thankyou-art" />
            <span className="payment-hero-spark payment-hero-spark-one" aria-hidden="true" />
            <div className="payment-hero-glass">
              <span className="payment-kicker"><ShieldIcon /> {t({ en: "Pet Villa secure checkout", zh: "Pet Villa 安全付款" })}</span>
              <h1>{t({ en: "Thank you", zh: "谢谢信任" })}</h1>
              <p>{t({ en: "We will take good care of your little baby.", zh: "我们会好好照顾你的小宝贝。" })}</p>
            </div>
            <div className="payment-total-orb">
              <span>{t({ en: "Pay Today", zh: "今天付款" })}</span>
              <strong>RM{amount}</strong>
              <small>{paymentContext === "balance" ? t({ en: "Balance payment", zh: "尾款" }) : amountMode === "deposit" && hasDeposit ? t({ en: "Deposit", zh: "订金" }) : t({ en: "Full payment", zh: "全款" })}</small>
            </div>
          </header>

          {submittedOrder ? (
            <section className="payment-confirm-card payment-confirm-card-top">
              <span className="payment-confirm-icon"><ShieldIcon /></span>
              <div className="min-w-0 flex-1">
                <p className="payment-mini-label">{t({ en: "Waiting verification", zh: "等待核对付款" })}</p>
                <h2>{formatOrderId(submittedOrder.orderId)}</h2>
                <p>{t({ en: "Your order is saved. Pet Villa will verify the QR payment before confirming the booking.", zh: "订单已保存。Pet Villa 会先核对 QR 付款，确认收到款项后才正式确认预约。" })}</p>
              </div>
              <div className="payment-confirm-actions">
                <a href="/orders">{t({ en: "View Order", zh: "查看订单" })}</a>
                <a href="https://wa.me/601163830339" target="_blank" rel="noreferrer"><WhatsAppIcon /> WhatsApp</a>
              </div>
            </section>
          ) : null}

          <section className="payment-checkout-card">
            <div className="payment-receipt-strip">
              <div>
                <span className="payment-pet-avatar payment-pet-avatar-stack">
                  {booking?.pets.map((pet) => (
                    <img key={pet.id} src={dogAvatarSrc(pet.photoDataUrl)} alt={pet.name} />
                  ))}
                </span>
                <p>{petNames || t({ en: "Selected pets", zh: "已选宠物" })}</p>
                <strong>{stayLabel}</strong>
              </div>
              <div>
                <span><MoonIcon /></span>
                <p>{draft.serviceLabel}</p>
                <strong>{draft.dateLabel}</strong>
              </div>
              <div>
                <span><CalendarIcon /></span>
                <p>{paymentContext === "balance" ? t({ en: "After Payment", zh: "付款后尾款" }) : t({ en: "Balance", zh: "尾款" })}</p>
                <strong>RM{balance}</strong>
              </div>
            </div>

            <div className="payment-section-caption">
              <div>
                <p>{t({ en: "Step 1", zh: "步骤 1" })}</p>
                <h2>{paymentContext === "balance" ? t({ en: "Pay Outstanding Balance", zh: "支付尾款" }) : t({ en: "Choose Amount", zh: "选择付款金额" })}</h2>
              </div>
              <span>{paymentContext === "balance" ? t({ en: "Exact balance", zh: "准确尾款" }) : t({ en: "Tap to select", zh: "点击选择" })}</span>
            </div>

            <div className="payment-amount-switch">
              {paymentContext !== "balance" && hasDeposit ? (
                <button type="button" data-active={amountMode === "deposit"} onClick={() => setAmountMode("deposit")}>
                  <span>{t({ en: "Recommended", zh: "推荐" })}</span>
                  <strong>{t({ en: "RM50 Deposit", zh: "RM50 订金" })}</strong>
                  <small>{t({ en: `Later RM${draft.balance}`, zh: `之后 RM${draft.balance}` })}</small>
                  <b>{amountMode === "deposit" ? "✓" : "Tap"}</b>
                </button>
              ) : null}
              <button type="button" data-active={amountMode === "full"} onClick={() => setAmountMode("full")}>
                <span>{paymentContext === "balance" ? t({ en: "Outstanding", zh: "待付" }) : hasDeposit ? t({ en: "Optional", zh: "可选" }) : t({ en: "Required", zh: "需要" })}</span>
                <strong>{paymentContext === "balance" ? t({ en: "Pay Balance", zh: "支付尾款" }) : t({ en: "Pay in Full", zh: "全额付款" })}</strong>
                <small>RM{paymentContext === "balance" ? amount : total}</small>
                <b>{amountMode === "full" ? "✓" : "Tap"}</b>
              </button>
            </div>

            <div className="payment-section-caption payment-section-caption-method">
              <div>
                <p>{t({ en: "Step 2", zh: "步骤 2" })}</p>
                <h2>{t({ en: "Payment Method", zh: "付款方式" })}</h2>
              </div>
              <span>{selectedMethod.shortName}</span>
            </div>

            <div className="payment-logo-rail" aria-label={t({ en: "Payment methods", zh: "付款方式" })}>
              {paymentMethods.map((item) => (
                <PaymentLogo key={item.id} method={item} selected={method === item.id} compact onClick={() => setMethod(item.id)} />
              ))}
            </div>

            <div className="payment-method-preview">
              <div className="payment-method-heading">
                <PaymentLogo method={selectedMethod} compact />
                <div>
                  <p>{t({ en: "Selected Method", zh: "已选付款方式" })}</p>
                  <h2>{selectedMethod.name}</h2>
                </div>
              </div>

              {method === "qr" ? (
                <div className="payment-duitnow-compact">
                  <div className="payment-qr-mini payment-qr-real">
                    <img src={businessSettings.paymentQrUrl} alt="Pet Villa Touch 'n Go DuitNow QR" />
                  </div>
                  <div className="payment-merchant-compact">
                    <span>{t({ en: "Scan with", zh: "扫码方式" })}</span>
                    <strong>{t({ en: "Touch 'n Go / DuitNow QR", zh: "Touch 'n Go / DuitNow QR" })}</strong>
                    <p>{t({ en: "Scan the QR, pay the exact amount, then tap I Have Paid. Pet Villa will verify before confirmation.", zh: "扫描 QR、支付正确金额后点击我已付款。Pet Villa 核对收到款项后才会确认预约。" })}</p>
                    <div>
                      <small>{t({ en: "Pay Today", zh: "今天付款" })}</small>
                      <b>RM{amount}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="payment-bank-transfer-card">
                  <div className="payment-bank-row">
                    <span>{t({ en: "Account Name", zh: "户口名字" })}</span>
                    <strong>{businessSettings.accountName}</strong>
                  </div>
                  <div className="payment-bank-row">
                    <span>{t({ en: "Bank", zh: "银行" })}</span>
                    <strong>{businessSettings.bankName}</strong>
                  </div>
                  <div className="payment-bank-row">
                    <span>{t({ en: "Account Number", zh: "户口号码" })}</span>
                    <strong>{businessSettings.accountNumber}</strong>
                  </div>
                  <div className="payment-bank-amount">
                    <span>{t({ en: "Transfer Today", zh: "今天转账" })}</span>
                    <b>RM{amount}</b>
                  </div>
                  <p>{t({ en: "Transfer the exact amount, then tap I Have Paid. Pet Villa will verify the received payment before confirming your order.", zh: "转账正确金额后点击我已付款。Pet Villa 会先核对收到款项，之后才确认订单。" })}</p>
                </div>
              )}
            </div>

            <details className="payment-details-toggle">
              <summary>
                <span className="payment-details-summary-copy">
                  <strong>{t({ en: "Receipt Details", zh: "收据明细" })}</strong>
                  <small>{t({ en: "Tap to view booking total, paid today and balance.", zh: "点击查看预约总额、今天付款和尾款。" })}</small>
                </span>
                <span className="payment-details-summary-total">RM{total}<b>⌄</b></span>
              </summary>
              <div>
                {voucherDiscount > 0 ? (
                  <>
                    <p><span>{t({ en: "Subtotal", zh: "小计" })}</span><strong>RM{subtotal}</strong></p>
                    {booking?.appliedVouchers?.length ? booking.appliedVouchers.map((voucher) => (
                      <p key={voucher.id}><span>{voucher.code}</span><strong>-RM{voucher.discount}</strong></p>
                    )) : (
                      <p><span>{booking?.voucherCode || t({ en: "Voucher", zh: "优惠券" })}</span><strong>-RM{voucherDiscount}</strong></p>
                    )}
                  </>
                ) : null}
                <p><span>{t({ en: "Booking Total", zh: "预约总额" })}</span><strong>RM{total}</strong></p>
                <p><span>{t({ en: "Pay Today", zh: "今天付款" })}</span><strong>RM{amount}</strong></p>
                <p><span>{t({ en: "Balance Later", zh: "稍后尾款" })}</span><strong>RM{balance}</strong></p>
              </div>
            </details>

            <div className="payment-trust-row">
              <span><ShieldIcon /> SSL Secure</span>
              <span><WhatsAppIcon /> WhatsApp Support</span>
            </div>

            {message ? <p className="payment-message">{message}</p> : null}
            {submittedOrder ? (
              <a href="/orders" className="payment-primary payment-primary-compact w-full">
                {t({ en: "View Submitted Order", zh: "查看已提交订单" })}
              </a>
            ) : (
              <button type="button" disabled={paymentSubmitting} onClick={() => void confirmPayment()} className="payment-primary payment-primary-compact w-full">
                {paymentSubmitting ? t({ en: "Submitting securely...", zh: "正在安全提交..." }) : buttonText}
              </button>
            )}
          </section>

          {submittedOrder ? (
            <aside className="payment-success-sheet" role="status" aria-live="polite">
              <span><ShieldIcon /></span>
              <div>
                <p>{t({ en: "Waiting verification", zh: "等待核对付款" })}</p>
                <strong>{formatOrderId(submittedOrder.orderId)}</strong>
              </div>
              <a href="/orders">{t({ en: "View", zh: "查看" })}</a>
            </aside>
          ) : null}
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
