type Props = {
  children: React.ReactNode;
  tone?: "default" | "green";
};

export function Card({ children, tone = "default" }: Props) {
  return <div className={`card ${tone === "green" ? "green" : ""}`}>{children}</div>;
}
