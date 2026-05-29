"use client";

import { useEffect, useState } from "react";
import { apiRequest, getSession, saveRecent } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

type Booking = {
  id: string;
  status: string;
  service_type: string;
  start_at: string;
  end_at: string;
  subtotal_sen: number;
};

export function OrdersPanel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const session = getSession();
    if (!session) {
      setError("Please login first.");
      return;
    }
    const data = await apiRequest<Booking[]>("/bookings", { userId: session.user.id });
    setBookings(data);
    if (data[0]?.id) saveRecent("booking", data[0].id);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load orders."));
  }, []);

  return (
    <div className="interactivePanel">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="button" onClick={load}>Refresh orders</Button>
      <div className="listStack">
        {bookings.map((booking) => (
          <button className="dataCard" key={booking.id} onClick={() => saveRecent("booking", booking.id)}>
            <strong>{booking.status}</strong>
            <span>{booking.service_type} · RM {(booking.subtotal_sen / 100).toFixed(2)} · {new Date(booking.start_at).toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
