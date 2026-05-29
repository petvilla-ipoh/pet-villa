type Props = {
  tone?: "info" | "success" | "error";
  children: React.ReactNode;
};

export function Notice({ tone = "info", children }: Props) {
  return <div className={`notice ${tone}`}>{children}</div>;
}
