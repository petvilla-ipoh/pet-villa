import { PRICING } from "./constants";
import type { BookingQuoteInput } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type BookingQuote = {
  currency: "MYR";
  subtotalSen: number;
  depositSen: number;
  finalPaymentSen: number;
  units: number;
  unitLabel: "night" | "hour";
};

export function calculateBookingQuote(input: BookingQuoteInput): BookingQuote {
  const durationMs = input.endAt.getTime() - input.startAt.getTime();
  if (durationMs <= 0) {
    throw new Error("Booking end time must be after start time.");
  }

  if (input.serviceType === "overnight_boarding") {
    const nights = Math.max(1, Math.ceil(durationMs / DAY_MS));
    return splitPayment(nights * PRICING.overnightBoardingPerNightSen, nights, "night");
  }

  const hours = Math.max(1, Math.ceil(durationMs / HOUR_MS));
  return splitPayment(hours * PRICING.daycarePerHourSen, hours, "hour");
}

function splitPayment(subtotalSen: number, units: number, unitLabel: "night" | "hour"): BookingQuote {
  const depositSen = Math.round(subtotalSen * (PRICING.depositPercent / 100));
  return {
    currency: PRICING.currency,
    subtotalSen,
    depositSen,
    finalPaymentSen: subtotalSen - depositSen,
    units,
    unitLabel
  };
}

export function formatMoney(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`;
}
