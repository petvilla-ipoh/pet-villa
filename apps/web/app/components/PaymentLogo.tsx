"use client";

export type PaymentMethodId = "duitnow" | "fpx" | "tng" | "grabpay" | "card";

type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  detail: string;
  logo: string;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "duitnow", name: "DuitNow QR", detail: "Scan & Pay", logo: "/assets/payment/duitnow.svg" },
  { id: "fpx", name: "FPX Online Banking", detail: "Maybank · CIMB · RHB", logo: "/assets/payment/fpx.svg" },
  { id: "tng", name: "Touch 'n Go eWallet", detail: "Pay with TNG eWallet", logo: "/assets/payment/tng-ewallet.svg" },
  { id: "grabpay", name: "GrabPay", detail: "Pay with Grab Wallet", logo: "/assets/payment/grabpay.svg" },
  { id: "card", name: "Credit / Debit Card", detail: "Visa · Mastercard", logo: "/assets/payment/visa-mastercard.svg" }
];

function PaymentMark({ method, compact = false }: { method: PaymentMethod; compact?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-[12px] border border-villa-primary-light bg-white ${compact ? "h-7 w-12" : "h-12 w-16"}`}>
      <img src={method.logo} alt={`${method.name} logo`} className="h-full w-full object-contain p-1.5" />
    </span>
  );
}

export function PaymentLogo({
  method,
  selected = false,
  compact = false,
  onClick
}: {
  method: PaymentMethod;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  if (compact) {
    return (
      <div className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-villa-primary-light bg-white px-2 shadow-sm">
        <PaymentMark method={method} compact />
        <span className="text-[10px] font-black text-villa-text-primary">{method.id === "card" ? "Visa / MC" : method.name}</span>
      </div>
    );
  }

  const classes = `flex w-full items-center gap-[14px] rounded-[14px] border-[1.5px] px-4 py-[14px] text-left transition-all duration-200 ${
    selected
      ? "border-villa-primary bg-villa-primary-bg shadow-[0_0_0_3px_rgba(232,146,124,0.15)]"
      : "border-villa-primary-light bg-white hover:border-villa-primary hover:bg-villa-primary-bg"
  }`;

  const content = (
    <>
      <PaymentMark method={method} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-sm font-black text-villa-text-primary">{method.name}</span>
        <span className="mt-1 block text-xs font-bold text-villa-text-muted">{method.detail}</span>
      </span>
      {selected ? <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-villa-primary text-sm font-black text-white">✓</span> : <span className="h-7 w-7 shrink-0 rounded-full border border-villa-primary-light" />}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}

export function PaymentLogoStrip({ compact = true }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {paymentMethods.map((method) => (
        <PaymentLogo key={method.id} method={method} compact={compact} />
      ))}
    </div>
  );
}
