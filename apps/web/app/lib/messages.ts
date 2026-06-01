"use client";

export type VillaMessage = {
  id: string;
  from: "owner" | "host";
  text: string;
  createdAt: string;
};

const messagesKey = "pet-villa-chat-thread";

const seedMessages: VillaMessage[] = [
  { id: "msg-seed-1", from: "host", text: "Mochi has settled in. I will send another photo soon.", createdAt: "2026-06-01T10:00:00.000Z" },
  { id: "msg-seed-2", from: "owner", text: "Thank you. Please watch her before sleep.", createdAt: "2026-06-01T10:04:00.000Z" }
];

export function readMessages(): VillaMessage[] {
  if (typeof window === "undefined") return seedMessages;
  try {
    const raw = window.localStorage.getItem(messagesKey);
    return raw ? (JSON.parse(raw) as VillaMessage[]) : seedMessages;
  } catch {
    return seedMessages;
  }
}

export function sendMessage(from: VillaMessage["from"], text: string) {
  if (typeof window === "undefined") return;
  const clean = text.trim();
  if (!clean) return;
  const next = [...readMessages(), { id: `msg-${Date.now()}`, from, text: clean, createdAt: new Date().toISOString() }];
  window.localStorage.setItem(messagesKey, JSON.stringify(next));
  window.dispatchEvent(new Event("pet-villa-messages"));
}
