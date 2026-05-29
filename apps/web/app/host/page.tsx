import { ButtonLink } from "../ui/ButtonLink";
import { Card } from "../ui/Card";
import { PageHero } from "../ui/PageHero";
import { Stat } from "../ui/Stat";
import { HostDashboardPanel } from "./HostDashboardPanel";

export default function HostPage() {
  return (
    <main>
      <PageHero eyebrow="Host dashboard" title="Manage the villa day" body="Review booking requests, manage capacity, post diary updates, track income, and keep service settings locked to small-dog care." cta={{ href: "/services", label: "View service rules" }} />
      <section className="section">
        <HostDashboardPanel />
      </section>
      <section className="section grid three">
        <Card><h3>Capacity</h3><div className="statsRow"><Stat label="Accepted today" value="2/3" /><Stat label="Pending" value="4" /></div></Card>
        <Card><h3>Request</h3><p>Mochi - 6.2kg - vaccinated - calm.</p><div className="actions"><ButtonLink href="/host">Confirm</ButtonLink><ButtonLink href="/host" variant="ghost">Reject</ButtonLink></div></Card>
        <Card><h3>Income</h3><p>Deposits RM160 - final payments RM120 - withdrawable RM280.</p></Card>
      </section>
    </main>
  );
}
