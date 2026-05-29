import { Card } from "../ui/Card";
import { PageHero } from "../ui/PageHero";
import { DiaryPanel } from "./DiaryPanel";

export default function DiaryPage() {
  return (
    <main>
      <PageHero eyebrow="Pet diary" title="Daily photo and video updates" body="The host posts 3-5 updates per day, including meals, mood, activity, rest, and health alerts." cta={{ href: "/chat", label: "Chat with host" }} />
      <section className="section">
        <DiaryPanel />
      </section>
      <section className="section grid three">
        {["Breakfast done", "Indoor play", "Nap under AC"].map((item) => (
          <Card key={item}><div className="mediaTile">PHOTO</div><h3>{item}</h3><p>Mochi is comfortable and monitored closely.</p></Card>
        ))}
      </section>
    </main>
  );
}
