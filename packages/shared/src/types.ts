export type ServiceType = "overnight_boarding" | "daycare";

export type BookingStatus =
  | "pending_confirmation"
  | "confirmed_awaiting_deposit"
  | "deposit_paid"
  | "in_boarding"
  | "awaiting_final_payment"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentStage = "deposit" | "final";

export type PaymentMethod =
  | "duitnow_qr"
  | "fpx"
  | "touch_n_go"
  | "grabpay"
  | "visa_mastercard";

export type DogEligibilityInput = {
  weightKg: number;
  hasAggression: boolean;
  hasFleas: boolean;
  vaccineStatus: "valid" | "expired" | "unknown";
};

export type BookingQuoteInput = {
  serviceType: ServiceType;
  startAt: Date;
  endAt: Date;
};

export type BookingTransitionActor = "owner" | "host" | "system";

export type NotificationType =
  | "booking_requested"
  | "booking_confirmed"
  | "booking_rejected"
  | "payment_success"
  | "diary_updated"
  | "new_message"
  | "boarding_started"
  | "boarding_ended"
  | "pet_health_alert";
