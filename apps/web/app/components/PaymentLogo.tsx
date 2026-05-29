"use client";

export type PaymentMethodId = "duitnow" | "fpx" | "tng" | "grabpay" | "card";

type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  detail: string;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "duitnow", name: "DuitNow QR", detail: "🇲🇾 Scan & pay" },
  { id: "fpx", name: "FPX Online Banking", detail: "Maybank · CIMB · RHB" },
  { id: "tng", name: "Touch 'n Go eWallet", detail: "TNG eWallet" },
  { id: "grabpay", name: "GrabPay", detail: "Grab eWallet" },
  { id: "card", name: "Credit / Debit Card", detail: "Visa · Mastercard" }
];

function DuitNowLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" role="img" aria-label="DuitNow QR">
      <circle cx="24" cy="24" r="24" fill="#E30613" />
      <text x="24" y="31" textAnchor="middle" fontSize="22" fontWeight="800" fill="white" fontFamily="Arial, sans-serif">
        D
      </text>
    </svg>
  );
}

function FpxLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" role="img" aria-label="FPX Online Banking">
      <rect width="48" height="48" rx="10" fill="#003087" />
      <text x="24" y="29" textAnchor="middle" fontSize="14" fontWeight="900" fill="white" fontFamily="Arial, sans-serif">
        FPX
      </text>
    </svg>
  );
}

function TngLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" role="img" aria-label="Touch 'n Go eWallet">
      <defs>
        <linearGradient id="tng-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00B4FF" />
          <stop offset="100%" stopColor="#0066CC" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#tng-gradient)" />
      <path d="M27.5 6 13 27h9l-1.5 15L35 19h-9l1.5-13Z" fill="white" />
    </svg>
  );
}

function GrabPayLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" role="img" aria-label="GrabPay">
      <rect width="48" height="48" rx="10" fill="#00B14F" />
      <text x="24" y="31" textAnchor="middle" fontSize="22" fontWeight="900" fill="white" fontFamily="Arial, sans-serif">
        G
      </text>
    </svg>
  );
}

function CardLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" role="img" aria-label="Visa and Mastercard">
      <rect width="48" height="48" rx="10" fill="#ffffff" />
      <rect x="5" y="8" width="38" height="15" rx="3" fill="#1A1F71" />
      <text x="24" y="20" textAnchor="middle" fontSize="8" fontWeight="900" fontStyle="italic" fill="white" fontFamily="Arial, sans-serif">
        VISA
      </text>
      <circle cx="20" cy="32" r="9" fill="#EB001B" />
      <circle cx="28" cy="32" r="9" fill="#F79E1B" fillOpacity="0.92" />
    </svg>
  );
}

function Mark({ id }: { id: PaymentMethodId }) {
  if (id === "duitnow") return <DuitNowLogo />;
  if (id === "fpx") return <FpxLogo />;
  if (id === "tng") return <TngLogo />;
  if (id === "grabpay") return <GrabPayLogo />;
  return <CardLogo />;
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
        <span className="scale-[0.58]">
          <Mark id={method.id} />
        </span>
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
      <Mark id={method.id} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-sm font-black text-villa-text-primary">{method.name}</span>
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
