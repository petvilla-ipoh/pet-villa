import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { PageHero } from "../ui/PageHero";
import { ChatPanel } from "./ChatPanel";

export default function ChatPage() {
  return (
    <main>
      <PageHero eyebrow="Chat" title="Booking-linked messages" body="Owners and the host can exchange updates, questions, photos, and urgent care notes." cta={{ href: "/orders", label: "Back to order" }} />
      <section className="section">
        <ChatPanel />
      </section>
      <section className="section">
        <Card>
          <div className="chat">
            <p className="bubble host">Mochi has settled in. I will send another photo soon.</p>
            <p className="bubble owner">Thank you. Please watch her before sleep.</p>
          </div>
          <Field label="Message" value="Type a message..." />
        </Card>
      </section>
    </main>
  );
}
