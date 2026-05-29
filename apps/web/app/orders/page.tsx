import { BookingStatusBadge } from "../ui/BookingStatusBadge";
import { Card } from "../ui/Card";
import { PageHero } from "../ui/PageHero";
import { OrdersPanel } from "./OrdersPanel";

export default function OrdersPage() {
  return (
    <main>
      <PageHero eyebrow="Orders" title="Track booking progress" body="Owner bookings follow confirmation, deposit, boarding, final payment, completion, and review states." cta={{ href: "/diary", label: "Open diary" }} />
      <section className="section">
        <OrdersPanel />
      </section>
      <section className="section grid three">
        <Card><BookingStatusBadge label="Confirmed - deposit due" /><h3>Mochi</h3><p>Pay deposit to secure the stay.</p></Card>
        <Card><BookingStatusBadge label="In boarding" /><h3>Boba</h3><p>Diary and chat active.</p></Card>
        <Card><BookingStatusBadge label="Completed" /><h3>Luna</h3><p>Final payment complete, review submitted.</p></Card>
      </section>
    </main>
  );
}
