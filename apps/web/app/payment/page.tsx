import { Card } from "../ui/Card";
import { PaymentMethods } from "../ui/PaymentMethods";
import { ButtonLink } from "../ui/ButtonLink";
import { PageHero } from "../ui/PageHero";
import { Stat } from "../ui/Stat";
import { PaymentPanel } from "./PaymentPanel";

export default function PaymentPage() {
  return (
    <main>
      <PageHero eyebrow="Payment" title="50% deposit, 50% final" body="Stripe powers payment intents and webhook status updates. Use test mode before going live." cta={{ href: "/orders", label: "View orders" }} />
      <section className="section split">
        <Card>
          <h3>Choose method</h3>
          <PaymentPanel />
        </Card>
        <Card>
          <h3>Payment summary</h3>
          <PaymentMethods />
          <div className="statsRow">
            <Stat label="Total" value="RM 80" />
            <Stat label="Deposit" value="RM 40" />
            <Stat label="Final" value="RM 40" />
          </div>
        </Card>
      </section>
    </main>
  );
}
