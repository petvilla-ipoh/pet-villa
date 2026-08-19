export const SAFE_VOID_CONFIRMATION = "VOID";

export const SAFE_VOID_ACKNOWLEDGEMENT =
  "This is a test, duplicate, invalid or created-in-error record. I understand that voiding excludes it from business reporting.";

export const SAFE_VOID_REASON_CODES = [
  "test_order",
  "duplicate_record",
  "invalid_record",
  "created_in_error",
  "other"
] as const;

export type SafeVoidReasonCode = (typeof SAFE_VOID_REASON_CODES)[number];

export const SAFE_VOID_REASON_LABELS: Record<SafeVoidReasonCode, string> = {
  test_order: "Test order",
  duplicate_record: "Duplicate record",
  invalid_record: "Invalid record",
  created_in_error: "Created in error",
  other: "Other"
};

export type VoidableOrder = {
  voidedAt?: string | null;
};

export type SafeVoidRequest = {
  reasonCode?: string;
  reason?: string;
  confirmation?: string;
  acknowledged?: boolean;
};

export function isSafeVoidReasonCode(value: unknown): value is SafeVoidReasonCode {
  return typeof value === "string" && SAFE_VOID_REASON_CODES.includes(value as SafeVoidReasonCode);
}

export function isVoidedOrder(order: VoidableOrder) {
  return Boolean(order.voidedAt);
}

export function isBusinessOrder(order: VoidableOrder) {
  return !isVoidedOrder(order);
}

export function onlyBusinessOrders<T extends VoidableOrder>(orders: T[]) {
  return orders.filter(isBusinessOrder);
}

export function validateSafeVoidRequest(input: SafeVoidRequest) {
  if (input.confirmation !== SAFE_VOID_CONFIRMATION) {
    return "Type VOID exactly to confirm this action.";
  }
  if (input.acknowledged !== true) {
    return "Confirm that this record is eligible for Safe Void.";
  }
  if (!isSafeVoidReasonCode(input.reasonCode)) {
    return "Choose a valid reason for voiding this order.";
  }
  if (input.reasonCode === "other" && !input.reason?.trim()) {
    return "Explain why this order must be voided.";
  }
  return "";
}
