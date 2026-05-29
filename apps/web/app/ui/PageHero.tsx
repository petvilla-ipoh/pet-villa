import { ButtonLink } from "./ButtonLink";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  cta?: { href: string; label: string };
};

export function PageHero({ eyebrow, title, body, cta }: Props) {
  return (
    <section className="pageHero">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{body}</p>
      {cta ? (
        <div className="actions">
          <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
          <ButtonLink href="/" variant="ghost">Back home</ButtonLink>
        </div>
      ) : null}
    </section>
  );
}
