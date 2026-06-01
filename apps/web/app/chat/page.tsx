"use client";

import { useEffect, useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { ProtectedPage } from "../components/ProtectedPage";
import { useLanguage } from "../components/LanguageProvider";
import { readMessages, sendMessage, type VillaMessage } from "../lib/messages";

export default function ChatPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<VillaMessage[]>([]);

  useEffect(() => {
    const sync = () => setMessages(readMessages());
    sync();
    window.addEventListener("pet-villa-messages", sync);
    return () => window.removeEventListener("pet-villa-messages", sync);
  }, []);

  function send() {
    if (!message.trim()) return;
    sendMessage("owner", message);
    setMessage("");
    setMessages(readMessages());
  }

  return (
    <ProtectedPage>
      <OwnerSidebar>
        <section className="p-5 sm:p-8 lg:p-10">
          <h1 className="page-title">{t({ en: "Chat with Host", zh: "联系寄宿主" })}</h1>
          <div className="mt-8 villa-card overflow-hidden">
            <div className="border-b border-villa-line bg-villa-peach/35 p-5 font-black">Pet Villa · Boarding Support</div>
            <div className="grid min-h-[480px] content-end gap-4 p-5">
              {messages.map((item) => (
                <div key={item.id} className={`max-w-[75%] rounded-[22px] p-4 font-bold ${item.from === "owner" ? "justify-self-end bg-villa-coral text-villa-text" : "bg-villa-bg text-villa-text/70"}`}>
                  {item.text}
                </div>
              ))}
            </div>
            <div className="flex gap-3 border-t border-villa-line p-5">
              <input className="villa-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t({ en: "Type a message...", zh: "输入消息..." })} />
              <button type="button" onClick={send} className="villa-button">{t({ en: "Send", zh: "发送" })}</button>
            </div>
          </div>
        </section>
      </OwnerSidebar>
    </ProtectedPage>
  );
}
