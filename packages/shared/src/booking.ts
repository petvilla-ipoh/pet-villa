import type { BookingStatus, BookingTransitionActor } from "./types";

export type BookingTransition = {
  from: BookingStatus;
  to: BookingStatus;
  actor: BookingTransitionActor;
  reason?: string;
};

const allowedTransitions: Record<BookingStatus, Partial<Record<BookingStatus, BookingTransitionActor[]>>> = {
  pending_confirmation: {
    confirmed_awaiting_deposit: ["host"],
    cancelled: ["owner", "host", "system"]
  },
  confirmed_awaiting_deposit: {
    deposit_paid: ["owner", "system"],
    cancelled: ["owner", "host", "system"],
    refunded: ["system"]
  },
  deposit_paid: {
    in_boarding: ["host", "system"],
    cancelled: ["owner", "host", "system"],
    refunded: ["system"]
  },
  in_boarding: {
    awaiting_final_payment: ["host", "system"],
    cancelled: ["host", "system"]
  },
  awaiting_final_payment: {
    completed: ["owner", "system"],
    refunded: ["system"]
  },
  completed: {},
  cancelled: {
    refunded: ["system"]
  },
  refunded: {}
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus, actor: BookingTransitionActor): boolean {
  return allowedTransitions[from]?.[to]?.includes(actor) ?? false;
}

export function transitionBooking(input: BookingTransition): BookingStatus {
  if (!canTransitionBooking(input.from, input.to, input.actor)) {
    throw new Error(`Invalid booking transition from ${input.from} to ${input.to} by ${input.actor}.`);
  }

  return input.to;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_confirmation: "Pending confirmation",
  confirmed_awaiting_deposit: "Confirmed - deposit due",
  deposit_paid: "Deposit paid",
  in_boarding: "In boarding",
  awaiting_final_payment: "Final payment due",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded"
};
