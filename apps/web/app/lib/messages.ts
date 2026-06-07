"use client";

import { getSupabaseBrowserClient } from "./supabase";

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

type ChatMessageRow = {
  id: string;
  thread_id: string;
  owner_id: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  sender_role: "owner" | "host";
  body: string | null;
  created_at: string;
};

const threadsKey = "pet-villa-chat-threads";
const chatMigrationKey = "pet-villa-chat-supabase-migrated";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function currentUser() {
  if (typeof window === "undefined") return { id: "guest", name: "Pet Owner", phone: "", role: "owner" };
  try {
    const session = JSON.parse(window.localStorage.getItem("pet-villa-session") || "{}")?.user;
    return {
      id: session?.id || "guest",
      name: session?.name || session?.fullName || "Pet Owner",
      phone: session?.phone || "",
      role: session?.role || "owner"
    };
  } catch {
    return { id: "guest", name: "Pet Owner", phone: "", role: "owner" };
  }
}

function isHostSession() {
  const role = currentUser().role;
  return role === "host" || role === "admin";
}

async function getSupabaseContext() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
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

function writeChatThreads(threads: ChatThread[], notify = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(threadsKey, JSON.stringify(threads));
  if (notify) window.dispatchEvent(new Event("pet-villa-messages"));
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

function threadFromRows(rows: ChatMessageRow[]) {
  const grouped = new Map<string, ChatThread>();
  rows.forEach((row) => {
    const threadId = row.thread_id;
    const existing = grouped.get(threadId);
    const message: VillaMessage = {
      id: row.id,
      threadId,
      from: row.sender_role,
      text: row.body || "",
      createdAt: row.created_at
    };
    grouped.set(threadId, {
      id: threadId,
      userId: row.owner_id || threadId.replace(/^thread-/, ""),
      userName: row.owner_name || existing?.userName || "Pet Owner",
      userPhone: row.owner_phone || existing?.userPhone || "",
      updatedAt: row.created_at > (existing?.updatedAt || "") ? row.created_at : existing?.updatedAt || row.created_at,
      messages: [...(existing?.messages || []), message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    });
  });
  return Array.from(grouped.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

async function listSupabaseThreads() {
  const context = await getSupabaseContext();
  if (!context) return null;
  const { data, error } = await context.supabase
    .from("chat_messages")
    .select("id, thread_id, owner_id, owner_name, owner_phone, sender_role, body, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return threadFromRows((data || []) as ChatMessageRow[]);
}

async function migrateLocalChatToSupabase() {
  const context = await getSupabaseContext();
  if (!context || !isHostSession() || typeof window === "undefined") return;
  if (window.localStorage.getItem(chatMigrationKey) === "true") return;
  const localThreads = readChatThreads();
  if (localThreads.length === 0) {
    window.localStorage.setItem(chatMigrationKey, "true");
    return;
  }
  const rows = localThreads.flatMap((thread) =>
    thread.messages.map((message) => ({
      thread_id: thread.id,
      owner_id: UUID_PATTERN.test(thread.userId) ? thread.userId : null,
      owner_name: thread.userName || "Pet Owner",
      owner_phone: thread.userPhone || "",
      sender_role: message.from,
      body: message.text,
      created_at: message.createdAt
    }))
  );
  if (rows.length === 0) {
    window.localStorage.setItem(chatMigrationKey, "true");
    return;
  }
  const { error } = await context.supabase.from("chat_messages").insert(rows);
  if (error) throw error;
  window.localStorage.setItem(chatMigrationKey, "true");
}

export async function loadChatThreads() {
  const fallback = readChatThreads();
  try {
    if (isHostSession()) await migrateLocalChatToSupabase();
    const threads = await listSupabaseThreads();
    if (!threads) return fallback;
    if (threads.length > 0 || isHostSession()) writeChatThreads(threads, false);
    return threads.length > 0 ? threads : fallback;
  } catch (error) {
    console.warn("Supabase chat load failed; using localStorage fallback.", error);
    return fallback;
  }
}

export async function loadMessages(threadId = getCurrentThreadId()) {
  const threads = await loadChatThreads();
  const thread = threads.find((item) => item.id === threadId);
  if (thread) return thread.messages;
  return readMessages(threadId);
}

function upsertLocalMessage(from: VillaMessage["from"], text: string, threadId: string) {
  const user = currentUser();
  const threads = readChatThreads();
  const existing = threads.find((thread) => thread.id === threadId);
  const now = new Date().toISOString();
  const message: VillaMessage = {
    id: `msg-${Date.now()}`,
    threadId,
    from,
    text,
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

  writeChatThreads([nextThread, ...threads.filter((thread) => thread.id !== threadId)]);
}

export function sendMessage(from: VillaMessage["from"], text: string, threadId = getCurrentThreadId()) {
  const clean = text.trim();
  if (!clean) return;
  upsertLocalMessage(from, clean, threadId);
  void sendMessageToSupabase(from, clean, threadId).catch((error) => console.warn("Supabase chat send failed; using localStorage fallback.", error));
}

export async function sendMessageToSupabase(from: VillaMessage["from"], text: string, threadId = getCurrentThreadId()) {
  const clean = text.trim();
  if (!clean) return readMessages(threadId);
  const context = await getSupabaseContext();
  if (!context) return readMessages(threadId);
  const user = currentUser();
  const existing = readChatThreads().find((thread) => thread.id === threadId);
  const ownerId = from === "owner"
    ? context.userId
    : UUID_PATTERN.test(existing?.userId || threadId.replace(/^thread-/, ""))
      ? existing?.userId || threadId.replace(/^thread-/, "")
      : null;
  const { error } = await context.supabase.from("chat_messages").insert({
    thread_id: threadId,
    owner_id: ownerId,
    owner_name: existing?.userName || user.name || "Pet Owner",
    owner_phone: existing?.userPhone || user.phone || "",
    sender_role: from,
    body: clean
  });
  if (error) throw error;
  const threads = await loadChatThreads();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("pet-villa-messages"));
  return threads.find((thread) => thread.id === threadId)?.messages || readMessages(threadId);
}
