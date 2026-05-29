"use client";

import { useState } from "react";
import { apiRequest, getRecent, getSession } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

type PaymentResponse = {
  id?: string;
  status?: string;
  clientSecret?: string;
  payment?: { id: string; status: string };
};

export function PaymentPanel() {
  const [stage, setStage] = useState<"deposit" | "final">("deposit");
  const [method, setMethod] = useState("fpx");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function pay() {
    setError("");
    const session = getSession();
    const bookingId = getRecent("booking");
    if (!session || !bookingId) {
      setError("Please login and create/select a booking first.");
      return;
    }

    try {
      const data = await apiRequest<PaymentResponse>(`/bookings/${bookingId}/payments/${stage}`, {
        method: "POST",
        userId: session.user.id,
        idempotencyKey: `${stage}-${bookingId}-${Date.now()}`,
        body: JSON.stringify({ method })
      });
      setMessage(data.clientSecret ? `Stripe PaymentIntent ready. Client secret: ${data.clientSecret}` : `Payment recorded: ${data.status ?? data.payment?.status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    }
  }

  return (
    <div className="interactivePanel">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="segmented">
        <button className={stage === "deposit" ? "active" : ""} onClick={() => setStage("deposit")}>Deposit 50%</button>
        <button className={stage === "final" ? "active" : ""} onClick={() => setStage("final")}>Final 50%</button>
      </div>
      <div className="paymentMethods">
        {[
          ["duitnow_qr", "DuitNow QR"],
          ["fpx", "FPX"],
          ["touch_n_go", "Touch'n Go"],
          ["visa_mastercard", "Visa / Mastercard"]
        ].map(([value, label]) => (
          <button className={`payMethod ${method === value ? "selected" : ""}`} key={value} onClick={() => setMethod(value)}>
            <span>{label}</span><span>{method === value ? "●" : "○"}</span>
          </button>
        ))}
      </div>
      <Button type="button" onClick={pay}>Pay {stage === "deposit" ? "deposit" : "final payment"}</Button>
    </div>
  );
}
