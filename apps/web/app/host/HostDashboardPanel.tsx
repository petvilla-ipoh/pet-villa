"use client";

import { useEffect, useState } from "react";
import { apiRequest, getRecent, getSession } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

type Dashboard = {
  capacity: { todayAccepted: number; maxDogsPerDay: number };
  pendingRequests: { id: string; status: string; pet_id: string }[];
  currentlyBoarding: { id: string; status: string }[];
  revenueSen: number;
};

export function HostDashboardPanel() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const hostId = getRecent("host");
    if (!hostId) {
      setError("Create/login a host account or select a host first.");
      return;
    }
    setDashboard(await apiRequest<Dashboard>("/host/dashboard", { hostId }));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load host dashboard."));
  }, []);

  async function transition(path: string, success: string) {
    setError("");
    const session = getSession();
    const hostId = getRecent("host");
    const bookingId = getRecent("booking");
    if (!session || !hostId || !bookingId) {
      setError("Host session, selected host, and booking are required.");
      return;
    }
    try {
      await apiRequest(`/host/bookings/${bookingId}/${path}`, {
        method: "POST",
        userId: session.user.id,
        hostId,
        body: JSON.stringify({ reason: success })
      });
      setMessage(success);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  async function blockDate(formData: FormData) {
    const hostId = getRecent("host");
    if (!hostId) {
      setError("Selected host is required.");
      return;
    }
    await apiRequest(`/host/availability/${String(formData.get("date"))}`, {
      method: "PUT",
      hostId,
      body: JSON.stringify({ blocked: formData.get("blocked") === "on", notes: String(formData.get("notes")) })
    });
    setMessage("Calendar updated.");
  }

  async function postDiary(formData: FormData) {
    const session = getSession();
    const hostId = getRecent("host");
    const bookingId = getRecent("booking");
    if (!session || !hostId || !bookingId) {
      setError("Host session, selected host, and booking are required.");
      return;
    }
    await apiRequest(`/host/bookings/${bookingId}/diary`, {
      method: "POST",
      userId: session.user.id,
      hostId,
      body: JSON.stringify({
        mood: String(formData.get("mood")),
        body: String(formData.get("body")),
        mealNotes: String(formData.get("mealNotes")),
        activityNotes: String(formData.get("activityNotes")),
        healthAlert: formData.get("healthAlert") === "on",
        media: [{ type: "photo", url: String(formData.get("mediaUrl")) }]
      })
    });
    setMessage("Diary posted from host dashboard.");
  }

  return (
    <div className="interactivePanel">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="button" onClick={load}>Refresh dashboard</Button>
      {dashboard ? (
        <div className="statsRow">
          <div className="stat"><strong>{dashboard.capacity.todayAccepted}/{dashboard.capacity.maxDogsPerDay}</strong><span>Today capacity</span></div>
          <div className="stat"><strong>{dashboard.pendingRequests.length}</strong><span>Pending</span></div>
          <div className="stat"><strong>RM {(dashboard.revenueSen / 100).toFixed(2)}</strong><span>Revenue</span></div>
        </div>
      ) : null}
      <div className="actions">
        <Button type="button" onClick={() => transition("confirm", "Booking confirmed.")}>Confirm selected booking</Button>
        <Button type="button" variant="ghost" onClick={() => transition("reject", "Booking rejected.")}>Reject selected booking</Button>
        <Button type="button" variant="secondary" onClick={() => transition("start", "Boarding started.")}>Start boarding</Button>
        <Button type="button" variant="secondary" onClick={() => transition("end", "Boarding ended.")}>End boarding</Button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); blockDate(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Calendar date<input name="date" type="date" defaultValue="2026-06-10" /></label>
        <label className="field">Notes<input name="notes" defaultValue="Family day, limited availability" /></label>
        <label className="checkRow"><input name="blocked" type="checkbox" /> Block date</label>
        <Button type="submit" variant="ghost">Save calendar</Button>
      </form>
      <form onSubmit={(event) => { event.preventDefault(); postDiary(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Mood<input name="mood" defaultValue="calm" /></label>
        <label className="field">Meal notes<input name="mealNotes" defaultValue="Finished breakfast" /></label>
        <label className="field">Activity notes<input name="activityNotes" defaultValue="Indoor play and nap" /></label>
        <label className="field">Photo/video URL<input name="mediaUrl" defaultValue="s3://pet-villa/diary-update.jpg" /></label>
        <label className="field wide">Diary update<input name="body" defaultValue="Mochi is resting comfortably under 24h AC." /></label>
        <label className="checkRow"><input name="healthAlert" type="checkbox" /> Pet discomfort alert</label>
        <Button type="submit">Post diary from dashboard</Button>
      </form>
    </div>
  );
}
