"use client";

import { useEffect, useState } from "react";
import { apiRequest, getRecent, getSession, saveRecent } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

type Host = {
  id: string;
  display_name: string;
  city: string;
  rating_average: string;
};

type Booking = {
  id: string;
  status: string;
  subtotal_sen: number;
  deposit_sen: number;
  final_payment_sen: number;
};

export function BookingPanel() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Host[]>("/hosts")
      .then((data) => {
        setHosts(data);
        if (data[0]?.id) saveRecent("host", data[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load hosts."));
  }, []);

  async function createBooking(formData: FormData) {
    setError("");
    const session = getSession();
    if (!session) {
      setError("Please login first.");
      return;
    }

    const petId = String(formData.get("petId") || getRecent("pet"));
    const hostId = String(formData.get("hostId") || getRecent("host"));
    if (!petId || !hostId) {
      setError("Please create a pet profile and select a host first.");
      return;
    }

    try {
      const booking = await apiRequest<Booking>("/bookings", {
        method: "POST",
        userId: session.user.id,
        body: JSON.stringify({
          petId,
          hostId,
          serviceType: String(formData.get("serviceType")),
          startAt: String(formData.get("startAt")),
          endAt: String(formData.get("endAt")),
          ownerNotes: String(formData.get("ownerNotes"))
        })
      });
      saveRecent("booking", booking.id);
      setMessage(`Booking request sent. Status: ${booking.status}. Deposit: RM ${(booking.deposit_sen / 100).toFixed(2)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create booking.");
    }
  }

  return (
    <div className="interactivePanel">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="listStack">
        {hosts.map((host) => (
          <button className="dataCard" key={host.id} onClick={() => saveRecent("host", host.id)}>
            <strong>{host.display_name}</strong>
            <span>{host.city} · rating {host.rating_average ?? "0.00"} · tap to select</span>
          </button>
        ))}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); createBooking(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Selected pet ID<input name="petId" defaultValue={getRecent("pet")} placeholder="Create a pet first" /></label>
        <label className="field">Selected host ID<input name="hostId" defaultValue={getRecent("host")} /></label>
        <label className="field">Service<select name="serviceType" defaultValue="overnight_boarding"><option value="overnight_boarding">Overnight Boarding</option><option value="daycare">Daycare</option></select></label>
        <label className="field">Check-in<input name="startAt" type="datetime-local" defaultValue="2026-06-10T09:00" /></label>
        <label className="field">Check-out<input name="endAt" type="datetime-local" defaultValue="2026-06-12T12:00" /></label>
        <label className="field wide">Pet notes<input name="ownerNotes" defaultValue="First stay, please send updates." /></label>
        <Button type="submit">Send booking request</Button>
      </form>
    </div>
  );
}
