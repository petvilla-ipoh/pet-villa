export function normalizeMalaysiaPhone(value: string) {
  let digits = value.trim().replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);

  const canonical = digits.startsWith("60")
    ? digits
    : digits.startsWith("0")
      ? `60${digits.slice(1)}`
      : digits.startsWith("1")
        ? `60${digits}`
        : "";

  return /^60[1-9]\d{7,10}$/.test(canonical) ? canonical : "";
}
