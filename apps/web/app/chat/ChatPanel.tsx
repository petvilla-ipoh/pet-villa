"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { apiRequest, getRecent, getSession } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [socketState, setSocketState] = useState("offline");

  async function load() {
    const bookingId = getRecent("booking");
    if (!bookingId) return;
    setMessages(await apiRequest<Message[]>(`/bookings/${bookingId}/messages`));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load messages."));
    const bookingId = getRecent("booking");
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    const socketBase = api.replace(/\/api\/v1\/?$/, "");
    let socket: Socket | null = null;
    if (bookingId) {
      socket = io(socketBase, { transports: ["websocket", "polling"] });
      socket.on("connect", () => {
        setSocketState("live");
        socket?.emit("joinBooking", bookingId);
      });
      socket.on("disconnect", () => setSocketState("offline"));
      socket.on("messageReceived", () => load().catch(() => undefined));
    }
    return () => {
      socket?.disconnect();
    };
  }, []);

  async function send(formData: FormData) {
    setError("");
    const session = getSession();
    const bookingId = getRecent("booking");
    if (!session || !bookingId) {
      setError("Login and booking are required.");
      return;
    }
    try {
      await apiRequest(`/bookings/${bookingId}/messages`, {
        method: "POST",
        userId: session.user.id,
        body: JSON.stringify({
          recipientId: String(formData.get("recipientId")),
          body: String(formData.get("body"))
        })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    }
  }

  return (
    <div className="interactivePanel">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Notice tone={socketState === "live" ? "success" : "info"}>Realtime chat: {socketState}</Notice>
      <div className="chat">
        {messages.map((message) => (
          <p className="bubble host" key={message.id}>{message.body}</p>
        ))}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); send(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Recipient user ID<input name="recipientId" placeholder="Host or owner user id" /></label>
        <label className="field wide">Message<input name="body" defaultValue="Can I have another update please?" /></label>
        <Button type="submit">Send message</Button>
      </form>
    </div>
  );
}
