"use client";

import { useEffect, useState } from "react";
import { apiRequest, getRecent, getSession } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

type Diary = {
  id: string;
  body: string;
  mood?: string;
  health_alert?: boolean;
  media?: unknown[];
  created_at: string;
};

export function DiaryPanel() {
  const [entries, setEntries] = useState<Diary[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const bookingId = getRecent("booking");
    if (!bookingId) return;
    setEntries(await apiRequest<Diary[]>(`/bookings/${bookingId}/diary`));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load diary."));
  }, []);

  async function postDiary(formData: FormData) {
    setError("");
    const session = getSession();
    const bookingId = getRecent("booking");
    const hostId = getRecent("host");
    if (!session || !bookingId || !hostId) {
      setError("Login, host, and booking are required.");
      return;
    }
    try {
      await apiRequest(`/host/bookings/${bookingId}/diary`, {
        method: "POST",
        userId: session.user.id,
        hostId,
        body: JSON.stringify({
          mood: String(formData.get("mood")),
          mealNotes: String(formData.get("mealNotes")),
          activityNotes: String(formData.get("activityNotes")),
          healthAlert: formData.get("healthAlert") === "on",
          body: String(formData.get("body")),
          media: [{ type: "photo", url: String(formData.get("mediaUrl")) }]
        })
      });
      setMessage("Diary update posted and notification triggered.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post diary.");
    }
  }

  return (
    <div className="interactivePanel">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <form onSubmit={(event) => { event.preventDefault(); postDiary(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Mood<input name="mood" defaultValue="calm" /></label>
        <label className="field">Meal notes<input name="mealNotes" defaultValue="Finished breakfast" /></label>
        <label className="field">Activity notes<input name="activityNotes" defaultValue="Indoor play and nap" /></label>
        <label className="field">Photo/video URL<input name="mediaUrl" defaultValue="s3://pet-villa/mochi-update.jpg" /></label>
        <label className="field wide">Diary body<input name="body" defaultValue="Mochi is comfortable, calm, and resting under 24h AC." /></label>
        <label className="checkRow"><input name="healthAlert" type="checkbox" /> Pet discomfort alert</label>
        <Button type="submit">Post diary update</Button>
      </form>
      <div className="listStack">
        {entries.map((entry) => (
          <div className="dataCard" key={entry.id}>
            <strong>{entry.health_alert ? "Health alert" : entry.mood ?? "Diary update"}</strong>
            <span>{entry.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
