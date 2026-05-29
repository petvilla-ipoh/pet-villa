"use client";

export type PaymentMethodId = "duitnow" | "fpx" | "tng" | "grabpay" | "card";

type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  detail: string;
  flag?: string;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "duitnow", name: "DuitNow QR", detail: "Scan & pay instantly · 扫码即付", flag: "🇲🇾" },
  { id: "fpx", name: "FPX Online Banking", detail: "Maybank · CIMB · RHB · Public Bank" },
  { id: "tng", name: "Touch 'n Go", detail: "TNG eWallet · 电子钱包" },
  { id: "grabpay", name: "GrabPay", detail: "Grab eWallet · 钱包付款" },
  { id: "card", name: "Credit / Debit Card", detail: "Visa · Mastercard" }
];

function DuitNowMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid h-7 w-7 place-items-center rounded-full bg-[#E30613] text-xs font-black text-white" : "grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-[#E30613] text-xl font-black text-white"}>
      D
    </div>
  );
}

function FpxMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid h-7 min-w-12 place-items-center rounded-md bg-[#003087] px-2 text-xs font-black text-white" : "grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-[#003087] text-sm font-black text-white"}>
      FPX
    </div>
  );
}

function TngMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid h-7 w-7 place-items-center rounded-md bg-[linear-gradient(135deg,#00B4FF,#0066CC)] text-sm font-black text-white" : "grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#00B4FF,#0066CC)] text-xl font-black text-white"}>
      ⚡
    </div>
  );
}

function GrabPayMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid h-7 w-7 place-items-center rounded-full bg-[#00B14F] text-xs font-black text-white" : "grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-[#00B14F] text-xl font-black text-white"}>
      G
    </div>
  );
}

function CardMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex h-7 min-w-[72px] items-center justify-center gap-1 rounded-md border border-villa-primary-light bg-white px-2" : "flex h-12 w-12 shrink-0 items-center justify-center gap-1 rounded-[10px] bg-white p-1 shadow-sm"}>
      <span className="grid h-6 min-w-8 place-items-center rounded bg-[#1A1F71] px-1 text-[9px] font-black italic text-white">VISA</span>
      <span className="relative h-6 w-8">
        <span className="absolute left-0 top-1 h-5 w-5 rounded-full bg-[#EB001B]" />
        <span className="absolute right-0 top-1 h-5 w-5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </span>
    </div>
  );
}

function Mark({ id, compact = false }: { id: PaymentMethodId; compact?: boolean }) {
  if (id === "duitnow") return <DuitNowMark compact={compact} />;
  if (id === "fpx") return <FpxMark compact={compact} />;
  if (id === "tng") return <TngMark compact={compact} />;
  if (id === "grabpay") return <GrabPayMark compact={compact} />;
  return <CardMark compact={compact} />;
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
      <div className="inline-flex h-7 items-center gap-1 rounded-[10px] border border-villa-primary-light bg-white px-2">
        <Mark id={method.id} compact />
        <span className="text-[10px] font-black text-villa-text-primary">{method.id === "card" ? "Visa / Mastercard" : method.name}</span>
      </div>
    );
  }

  const classes = `flex w-full items-center gap-[14px] rounded-[14px] border-[1.5px] px-4 py-[14px] text-left transition duration-200 ${
    selected
      ? "border-villa-primary bg-villa-primary-bg shadow-[0_0_0_3px_rgba(232,146,124,0.15)]"
      : "border-villa-primary-light bg-white hover:border-villa-primary hover:bg-villa-primary-bg"
  }`;

  const content = (
    <>
      <Mark id={method.id} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-sm font-black text-villa-text-primary">
          {method.name} {method.flag ? <span aria-hidden="true">{method.flag}</span> : null}
        </span>
        <span className="mt-1 block text-xs font-bold text-villa-text-muted">{method.detail}</span>
      </span>
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
