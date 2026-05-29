export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_FAILED"
  | "RESOURCE_NOT_FOUND"
  | "DOG_NOT_ELIGIBLE"
  | "BOOKING_CONFLICT"
  | "INVALID_BOOKING_STATE"
  | "PAYMENT_FAILED"
  | "REFUND_FAILED"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export class ClientError extends Error {
  constructor(public apiError: ApiError, public status: number) {
    super(apiError.message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new ClientError(payload.error ?? { code: "INTERNAL_ERROR", message: "Network request failed." }, response.status);
  }

  return payload.data as T;
}

export function userMessageForError(error: unknown) {
  if (!(error instanceof ClientError)) return "Something went wrong. Please try again.";

  switch (error.apiError.code) {
    case "DOG_NOT_ELIGIBLE":
      return "This pet does not match The Pet Villa's small-dog boarding rules.";
    case "BOOKING_CONFLICT":
      return "That date is full. The Villa can host up to 3 dogs per day.";
    case "PAYMENT_FAILED":
      return "Payment failed. Please try another method or contact the host.";
    case "INVALID_BOOKING_STATE":
      return "This booking has moved to another status. Please refresh.";
    default:
      return error.apiError.message;
  }
}
