"use client";

import { useState } from "react";
import { OwnerSidebar } from "../components/OwnerSidebar";
import { useLanguage } from "../components/LanguageProvider";

export default function ChatPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { from: "host", text: "Mochi has settled in. I will send another photo soon." },
    { from: "owner", text: "Thank you. Please watch her before sleep." }
  ]);

  function send() {
    if (!message.trim()) return;
    setMessages((current) => [...current, { from: "owner", text: message }]);
    setMessage("");
  }

  return (
    <OwnerSidebar>
      <section className="p-5 sm:p-8 lg:p-10">
        <h1 className="font-title text-5xl font-black">{t({ en: "Chat with Host", zh: "联系寄宿主" })}</h1>
        <div className="mt-8 villa-card overflow-hidden">
          <div className="border-b border-villa-line bg-villa-peach/35 p-5 font-black">Mochi · Overnight · Jun 4-7</div>
          <div className="grid min-h-[480px] content-end gap-4 p-5">
            {messages.map((item, index) => (
              <div key={`${item.text}-${index}`} className={`max-w-[75%] rounded-[22px] p-4 font-bold ${item.from === "owner" ? "justify-self-end bg-villa-coral text-villa-text" : "bg-villa-bg text-villa-text/70"}`}>
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
  );
}
