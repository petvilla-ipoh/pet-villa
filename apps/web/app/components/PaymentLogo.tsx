"use client";

export type PaymentMethodId = "duitnow" | "fpx" | "tng" | "grabpay" | "visa" | "mastercard";

type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  detail: string;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "duitnow", name: "DuitNow", detail: "QR Malaysia" },
  { id: "fpx", name: "FPX", detail: "Online Banking" },
  { id: "tng", name: "Touch 'n Go", detail: "eWallet" },
  { id: "grabpay", name: "GrabPay", detail: "Wallet" },
  { id: "visa", name: "Visa", detail: "Credit / Debit" },
  { id: "mastercard", name: "Mastercard", detail: "Credit / Debit" }
];

function Mark({ id, compact = false }: { id: PaymentMethodId; compact?: boolean }) {
  const size = compact ? "h-7 min-w-12" : "h-9 min-w-16";

  if (id === "duitnow") {
    return <div className={`${size} grid place-items-center rounded-full bg-[#E30613] px-2 text-[10px] font-black text-white`}>DuitNow</div>;
  }
  if (id === "fpx") {
    return <div className={`${size} grid place-items-center rounded-md bg-[#003087] px-3 text-sm font-black text-white`}>FPX</div>;
  }
  if (id === "tng") {
    return <div className={`${size} grid place-items-center rounded-md bg-[linear-gradient(135deg,#00B4FF,#0066CC)] px-3 text-xs font-black text-white`}>⚡ TnG</div>;
  }
  if (id === "grabpay") {
    return <div className={`${size} grid place-items-center rounded-full bg-[#00B14F] px-3 text-[11px] font-black text-white`}>GrabPay</div>;
  }
  if (id === "visa") {
    return <div className={`${size} grid place-items-center rounded-md bg-[#1A1F71] px-3 text-sm font-black italic text-white`}>VISA</div>;
  }
  return (
    <div className={`${size} grid place-items-center px-2`}>
      <div className="relative h-7 w-12">
        <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-[#EB001B]" />
        <span className="absolute right-1 top-1 h-6 w-6 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </div>
    </div>
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
  const content = (
    <>
      <Mark id={method.id} compact={compact} />
      {compact ? null : (
        <span className="grid text-left leading-tight">
          <span className="text-sm font-black text-villa-text-primary">{method.name}{method.id === "duitnow" ? " 🇲🇾" : ""}</span>
          <span className="text-xs font-bold text-villa-text-muted">{method.detail}</span>
        </span>
      )}
      {compact && method.id === "mastercard" ? <span className="text-[10px] font-black text-villa-text-primary">Mastercard</span> : null}
    </>
  );

  const classes = compact
    ? "inline-flex h-7 items-center gap-1 rounded-[10px] border border-villa-primary-light bg-white px-2"
    : `flex h-12 w-full items-center gap-3 rounded-[10px] border-[1.5px] bg-white px-3 transition duration-200 ${
        selected ? "border-villa-primary shadow-[0_0_0_3px_rgba(232,146,124,0.2)]" : "border-villa-primary-light"
      }`;

  if (onClick) {
    return <button type="button" className={`${classes} text-left`} onClick={onClick}>{content}</button>;
  }

  return <div className={classes}>{content}</div>;
}

export function PaymentLogoStrip({ compact = true }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {paymentMethods.map((method) => <PaymentLogo key={method.id} method={method} compact={compact} />)}
    </div>
  );
}
