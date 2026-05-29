import Link from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
};

export function ButtonLink({ href, children, variant = "primary" }: Props) {
  return (
    <Link className={`button ${variant === "ghost" ? "ghost" : ""}`} href={href}>
      {children}
    </Link>
  );
}
