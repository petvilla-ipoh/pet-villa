const methods = ["DuitNow QR", "FPX", "Touch'n Go", "GrabPay", "Visa / Mastercard"];

export function PaymentMethods() {
  return (
    <div className="paymentMethods">
      {methods.map((method) => (
        <div className="payMethod" key={method}>
          <span>{method}</span>
          <span>○</span>
        </div>
      ))}
    </div>
  );
}
