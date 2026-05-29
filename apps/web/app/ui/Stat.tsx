type Props = {
  label: string;
  value: string;
};

export function Stat({ label, value }: Props) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
