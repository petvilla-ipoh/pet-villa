"use client";

export type VillaMessage = {
  id: string;
  threadId: string;
  from: "owner" | "host";
  text: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  updatedAt: string;
  messages: VillaMessage[];
};

const threadsKey = "pet-villa-chat-threads";

function currentUser() {
  if (typeof window === "undefined") return { id: "guest", name: "Pet Owner", phone: "" };
  try {
    const session = JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user;
    return {
      id: session?.id || "guest",
      name: session?.name || session?.fullName || "Pet Owner",
      phone: session?.phone || ""
    };
  } catch {
    return { id: "guest", name: "Pet Owner", phone: "" };
  }
}

function seedThread(): ChatThread {
  const user = currentUser();
  const threadId = `thread-${user.id}`;
  return {
    id: threadId,
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    updatedAt: "2026-06-01T10:04:00.000Z",
    messages: [
      { id: "msg-seed-1", threadId, from: "host", text: "Welcome to Pet Villa. You can message us here anytime.", createdAt: "2026-06-01T10:00:00.000Z" },
      { id: "msg-seed-2", threadId, from: "owner", text: "Hi, I would like to ask about boarding.", createdAt: "2026-06-01T10:04:00.000Z" }
    ]
  };
}

export function getCurrentThreadId() {
  return `thread-${currentUser().id}`;
}

export function readChatThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(threadsKey);
    const threads = raw ? (JSON.parse(raw) as ChatThread[]) : [];
    return threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export function readMessages(threadId = getCurrentThreadId()): VillaMessage[] {
  const thread = readChatThreads().find((item) => item.id === threadId);
  if (thread) return thread.messages;
  return threadId === getCurrentThreadId() ? seedThread().messages : [];
}

export function sendMessage(from: VillaMessage["from"], text: string, threadId = getCurrentThreadId()) {
  if (typeof window === "undefined") return;
  const clean = text.trim();
  if (!clean) return;

  const user = currentUser();
  const threads = readChatThreads();
  const existing = threads.find((thread) => thread.id === threadId);
  const now = new Date().toISOString();
  const message: VillaMessage = {
    id: `msg-${Date.now()}`,
    threadId,
    from,
    text: clean,
    createdAt: now
  };

  const nextThread: ChatThread = existing
    ? { ...existing, updatedAt: now, messages: [...existing.messages, message] }
    : {
        id: threadId,
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        updatedAt: now,
        messages: [message]
      };

  window.localStorage.setItem(threadsKey, JSON.stringify([nextThread, ...threads.filter((thread) => thread.id !== threadId)]));
  window.dispatchEvent(new Event("pet-villa-messages"));
}
