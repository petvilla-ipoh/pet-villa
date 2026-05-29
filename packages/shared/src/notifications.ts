import type { BookingStatus, NotificationType } from "./types";

export function notificationForBookingStatus(status: BookingStatus): NotificationType | null {
  switch (status) {
    case "pending_confirmation":
      return "booking_requested";
    case "confirmed_awaiting_deposit":
      return "booking_confirmed";
    case "deposit_paid":
      return "payment_success";
    case "in_boarding":
      return "boarding_started";
    case "awaiting_final_payment":
      return "boarding_ended";
    case "completed":
      return "payment_success";
    default:
      return null;
  }
}
