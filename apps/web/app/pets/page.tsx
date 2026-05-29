import { PageHero } from "../ui/PageHero";
import { PetProfilePanel } from "./PetProfilePanel";

export default function PetsPage() {
  return (
    <main>
      <PageHero eyebrow="Pet profile" title="Add an eligible small dog" body="The Villa accepts only vaccinated 1-12kg dogs with no aggression and no fleas. Save complete habits and special needs before booking." cta={{ href: "/booking", label: "Continue booking" }} />
      <section className="section">
        <PetProfilePanel />
      </section>
    </main>
  );
}
