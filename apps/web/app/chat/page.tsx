"use client";

import { useEffect, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { getCurrentThreadId, loadCustomerMessages, sendMessage, type VillaMessage } from "../lib/messages";

function ChatIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <path d="M9 15c0-5 4-8 9-8h12c5 0 9 3 9 8v9c0 5-4 8-9 8h-8l-9 7v-7c-3-1-4-4-4-8v-9Z" fill="#fff8f5" stroke="#e8927c" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M17 19h14M17 25h9" stroke="#8d65da" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export default function ChatPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<VillaMessage[]>([]);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const threadId = getCurrentThreadId();

  useEffect(() => {
    document.body.dataset.petVillaSurface = "chat";
    return () => {
      delete document.body.dataset.petVillaSurface;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let hasLoadedOnce = false;
    const sync = () => {
      if (hasLoadedOnce) setRefreshing(true);
      void loadCustomerMessages(threadId).then((nextMessages) => {
        if (!active) return;
        setMessages(nextMessages);
        hasLoadedOnce = true;
        setHasLoaded(true);
        setRefreshing(false);
        setError("");
      }).catch(() => {
        if (!active) return;
        setRefreshing(false);
        setError(hasLoadedOnce
          ? t({ en: "Unable to refresh — showing last known messages.", zh: "暂时无法刷新，正在显示上次同步的消息。" })
          : t({ en: "Messages could not be loaded. Please try again.", zh: "无法加载消息，请重试。" }));
      });
    };
    const handleVisibleSync = () => {
      if (document.visibilityState === "visible") sync();
    };
    sync();
    const interval = window.setInterval(handleVisibleSync, 8_000);
    window.addEventListener("pet-villa-messages", sync);
    window.addEventListener("focus", handleVisibleSync);
    document.addEventListener("visibilitychange", handleVisibleSync);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("pet-villa-messages", sync);
      window.removeEventListener("focus", handleVisibleSync);
      document.removeEventListener("visibilitychange", handleVisibleSync);
    };
  }, [threadId]);

  async function send() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await sendMessage("owner", message, threadId);
      setMessage("");
      setMessages(await loadCustomerMessages(threadId));
    } catch (sendError) {
      setError(sendError instanceof Error
        ? sendError.message
        : t({ en: "Your message could not be sent. Please try again.", zh: "\u6d88\u606f\u65e0\u6cd5\u53d1\u9001\uff0c\u8bf7\u91cd\u8bd5\u3002" }));
    } finally {
      setSending(false);
    }
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="owner-lite-page">
          <header className="owner-lite-header">
            <div className="owner-lite-title">
              <span><ChatIcon /></span>
              <div>
                <p>{t({ en: "Pet Villa Support", zh: "Pet Villa 客服" })}</p>
                <h1>{t({ en: "Chat", zh: "聊天" })}</h1>
              </div>
              <b>{messages.length}</b>
            </div>
            <p className="owner-lite-copy">{t({ en: "Message Pet Villa about bookings, payment, diary updates or pet care.", zh: "你可以询问预约、付款、日记更新或宠物照顾。" })}</p>
          </header>
          <span className="sr-only" aria-live="polite">{refreshing ? t({ en: "Refreshing messages", zh: "正在同步消息" }) : ""}</span>
          {error ? <p className="owner-lite-copy" role="alert">{error}</p> : null}

          <section className="chat-shell-card">
            <div className="chat-status-bar">
              <span><ChatIcon /></span>
              <div>
                <strong>Pet Villa</strong>
                <small>{t({ en: "Usually replies by WhatsApp during setup", zh: "目前设置阶段通常会用 WhatsApp 回复" })}</small>
              </div>
              <a href="https://wa.me/601163830339" target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
            <div className="chat-message-list">
              {!hasLoaded && !error ? (
                <div className="chat-empty-bubble" aria-busy="true">
                  <strong>{t({ en: "Loading your conversation", zh: "正在读取对话" })}</strong>
                  <span>{t({ en: "Securely syncing messages with Pet Villa.", zh: "正在安全同步 Pet Villa 消息。" })}</span>
                </div>
              ) : null}
              {hasLoaded && messages.length === 0 ? (
                <div className="chat-empty-bubble">
                  <strong>{t({ en: "No messages yet", zh: "还没有消息" })}</strong>
                  <span>{t({ en: "Send a message or use WhatsApp for urgent support.", zh: "你可以发送消息，紧急事项请使用 WhatsApp。" })}</span>
                </div>
              ) : null}
              {messages.map((item) => (
                <div key={item.id} className="chat-bubble" data-from={item.from === "owner" ? "owner" : "host"}>
                  {item.text}
                </div>
              ))}
            </div>
            <div className="chat-composer">
              <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t({ en: "Type a message...", zh: "输入消息..." })} />
              <button type="button" onClick={send}>{t({ en: "Send", zh: "发送" })}</button>
            </div>
          </section>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
