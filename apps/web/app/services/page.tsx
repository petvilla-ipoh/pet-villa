import { Card } from "../ui/Card";
import { PageHero } from "../ui/PageHero";
import { Stat } from "../ui/Stat";
import { OWNER_NOTICE } from "@pet-villa/shared";

export default function ServicesPage() {
  return (
    <main>
      <PageHero eyebrow="Services" title="Warm home-style small-dog care" body="No cages, 24h companionship, daily photo/video updates, same-room sleeping, and 24h air conditioning." cta={{ href: "/booking", label: "Book now" }} />
      <section className="section">
        <div className="grid three">
          <Card><h3>Overnight Boarding</h3><p>RM 40 per night. Check-out before 12:00pm.</p></Card>
          <Card><h3>Daycare</h3><p>RM 5 per hour. Check-in from 9:00am to 8:00pm.</p></Card>
          <Card><h3>Strict eligibility</h3><p>Only vaccinated 1-12kg dogs without aggression or fleas.</p></Card>
        </div>
        <div className="statsRow">
          <Stat label="Daily capacity" value="3 dogs" />
          <Stat label="Accepted weight" value="1-12kg" />
          <Stat label="Daily media" value="3-5" />
        </div>
        <div className="card noticeCard">
          <h3>Owner notice</h3>
          <ul>
            {OWNER_NOTICE.map((notice) => <li key={notice}>{notice}</li>)}
          </ul>
        </div>
      </section>
    </main>
  );
}
