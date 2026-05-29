import { ButtonLink } from "../ui/ButtonLink";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { PageHero } from "../ui/PageHero";
import { AuthPanel } from "./AuthPanel";

export default function AuthPage() {
  return (
    <main>
      <PageHero eyebrow="Login and register" title="Create your account" body="Owner and host accounts use the same API backend as the mobile app." cta={{ href: "/booking", label: "Start booking" }} />
      <section className="section">
        <AuthPanel />
      </section>
      <section className="section split">
        <Card><h3>Login</h3><Field label="Email" value="mei@example.com" /><Field label="Password" value="********" /><ButtonLink href="/orders">Login</ButtonLink></Card>
        <Card><h3>Register</h3><Field label="Name" value="Mei Ling" /><Field label="Phone" value="+60123456789" /><Field label="Email" value="mei@example.com" /><ButtonLink href="/booking">Create account</ButtonLink></Card>
      </section>
    </main>
  );
}
