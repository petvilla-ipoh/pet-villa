"use client";

export type PaymentMethodId = "qr" | "bank";

type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  shortName: string;
  detail: string;
  logo: string;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "qr", name: "QR Payment", shortName: "QR", detail: "Touch 'n Go / DuitNow scan", logo: "/assets/payment/duitnow.svg" },
  { id: "bank", name: "Bank Transfer", shortName: "Bank", detail: "Manual transfer details", logo: "/assets/payment/bank-transfer.svg" }
];

function PaymentMark({ method, compact = false }: { method: PaymentMethod; compact?: boolean }) {
  return (
    <span className={`payment-mark ${compact ? "payment-mark-compact" : ""}`}>
      <img src={method.logo} alt={`${method.name} logo`} />
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
    const content = (
      <>
        <PaymentMark method={method} compact />
        <span>{method.shortName}</span>
      </>
    );

    if (onClick) {
      return (
        <button type="button" className="payment-logo-pill" data-active={selected} onClick={onClick}>
          {content}
        </button>
      );
    }

    return (
      <span className="payment-logo-pill" data-active={selected}>
        {content}
      </span>
    );
  }

  const content = (
    <>
      <PaymentMark method={method} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-sm font-black text-villa-text-primary">{method.name}</span>
        <span className="mt-1 block text-xs font-bold text-villa-text-secondary">{method.detail}</span>
      </span>
      <span className="payment-check" data-active={selected}>{selected ? "✓" : ""}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="payment-method-card" data-active={selected} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="payment-method-card" data-active={selected}>{content}</div>;
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
