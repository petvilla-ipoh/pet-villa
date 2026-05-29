type Props = {
  label: string;
  value: string;
  wide?: boolean;
};

export function Field({ label, value, wide }: Props) {
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label>{label}</label>
      <input readOnly value={value} />
    </div>
  );
}
