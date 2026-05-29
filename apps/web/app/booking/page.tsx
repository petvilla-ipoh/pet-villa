import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { ButtonLink } from "../ui/ButtonLink";
import { PageHero } from "../ui/PageHero";
import { BookingPanel } from "./BookingPanel";

export default function BookingPage() {
  return (
    <main>
      <PageHero eyebrow="Booking" title="Request a stay" body="Choose service, dates, and pet details. The host confirms only when capacity and eligibility pass." cta={{ href: "/payment", label: "Continue to payment" }} />
      <section className="section">
        <BookingPanel />
      </section>
      <section className="section">
        <Card>
          <div className="formGrid">
            <Field label="Service" value="Overnight Boarding" />
            <Field label="Check-in" value="10 Jun 2026, 9:00am" />
            <Field label="Check-out" value="12 Jun 2026, 12:00pm" />
            <Field label="Pet" value="Mochi, 6.2kg" />
            <Field label="Vaccine" value="Valid" />
            <Field label="Special needs" value="Bring own food and blanket" wide />
          </div>
          <div className="actions"><ButtonLink href="/payment">Submit request</ButtonLink></div>
        </Card>
      </section>
    </main>
  );
}
