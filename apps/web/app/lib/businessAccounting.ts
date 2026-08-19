import type { VillaOrder } from "./orderFlow";
import { isBusinessOrder } from "./safeVoid";
import type { BusinessExpense } from "./hostOperations";

const BUSINESS_TIME_ZONE = "Asia/Kuala_Lumpur";
const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function safeAmount(value: number | null | undefined) {
  return Math.max(0, Number.isFinite(value) ? Number(value) : 0);
}

export function originalOrderAmount(order: VillaOrder) {
  if (!isBusinessOrder(order)) return 0;
  const explicitDiscount = safeAmount(order.voucherDiscount) + safeAmount(order.manualDiscount);
  return Math.max(safeAmount(order.subtotal), safeAmount(order.total) + explicitDiscount, safeAmount(order.total));
}

export function discountAmount(order: VillaOrder) {
  if (!isBusinessOrder(order)) return 0;
  const explicitDiscount = safeAmount(order.voucherDiscount) + safeAmount(order.manualDiscount);
  const derivedDiscount = Math.max(0, originalOrderAmount(order) - safeAmount(order.total));
  return Math.max(explicitDiscount, derivedDiscount);
}

export function collectedAmount(order: VillaOrder) {
  if (!isBusinessOrder(order)) return 0;
  return safeAmount(order.paid);
}

export function outstandingAmount(order: VillaOrder) {
  if (!isBusinessOrder(order)) return 0;
  if (order.status === "cancelled") return 0;
  return safeAmount(order.balance);
}

export function isSettledOrder(order: VillaOrder) {
  return collectedAmount(order) > 0 && outstandingAmount(order) === 0;
}

export function isPaymentRetained(order: VillaOrder) {
  return order.status === "cancelled" && collectedAmount(order) > 0;
}

export type OrderPaymentDisplayStatus = {
  kind: "not-paid" | "partially-paid" | "fully-paid" | "payment-retained" | "pending-verification";
  label: "Not Paid" | "Partially Paid" | "Fully Paid" | "Payment Retained" | "Pending Verification";
  total: number;
  paid: number;
  balance: number;
};

export function getOrderPaymentDisplayStatus(order: VillaOrder): OrderPaymentDisplayStatus {
  const total = safeAmount(order.total);
  const paid = collectedAmount(order);
  const balance = outstandingAmount(order);

  if (order.status === "cancelled") {
    return {
      kind: paid > 0 ? "payment-retained" : "not-paid",
      label: paid > 0 ? "Payment Retained" : "Not Paid",
      total,
      paid,
      balance
    };
  }

  if (order.status === "pending_verification") {
    return { kind: "pending-verification", label: "Pending Verification", total, paid, balance };
  }

  if (balance <= 0 || paid >= total) {
    return { kind: "fully-paid", label: "Fully Paid", total, paid, balance };
  }

  if (paid > 0) {
    return { kind: "partially-paid", label: "Partially Paid", total, paid, balance };
  }

  return { kind: "not-paid", label: "Not Paid", total, paid, balance };
}

export function businessDateFromTimestamp(timestamp?: string | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const parts = businessDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function orderCollectionDate(order: VillaOrder) {
  return businessDateFromTimestamp(order.createdAt);
}

export function ordersInRecordedDateRange(orders: VillaOrder[], from?: string, to?: string) {
  return orders.filter((order) => {
    if (!isBusinessOrder(order)) return false;
    const date = orderCollectionDate(order);
    if (!date) return false;
    return (!from || date >= from) && (!to || date <= to);
  });
}

export function ordersCompletedInDateRange(orders: VillaOrder[], from?: string, to?: string) {
  return orders.filter((order) => {
    if (!isBusinessOrder(order) || order.status !== "completed") return false;
    const date = businessDateFromTimestamp(order.completedAt);
    if (!date) return false;
    return (!from || date >= from) && (!to || date <= to);
  });
}

export function ordersCheckedInInDateRange(orders: VillaOrder[], from?: string, to?: string) {
  return orders.filter((order) => {
    if (!isBusinessOrder(order)) return false;
    const date = order.checkedInBusinessDate || businessDateFromTimestamp(order.checkedInAt);
    if (!date) return false;
    return (!from || date >= from) && (!to || date <= to);
  });
}

export function verifiedCollectionEventsInDateRange(orders: VillaOrder[], from?: string, to?: string) {
  return orders.flatMap((order) => {
    if (!isBusinessOrder(order)) return [];
    return (order.paymentVerifications || []).filter((event) => {
      const date = businessDateFromTimestamp(event.verifiedAt);
      return safeAmount(event.amount) > 0 && Boolean(date) && (!from || date >= from) && (!to || date <= to);
    });
  });
}

function monthBounds(businessMonth: string) {
  if (!/^\d{4}-\d{2}$/.test(businessMonth)) return null;
  const [year, month] = businessMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${businessMonth}-01`, end: `${businessMonth}-${String(lastDay).padStart(2, "0")}` };
}

export function legacyCollectionAttributionsInDateRange(orders: VillaOrder[], from?: string, to?: string) {
  if (!from || !to) return [];
  return orders.flatMap((order) => {
    if (!isBusinessOrder(order)) return [];
    return (order.legacyCollectionAttributions || []).filter((attribution) => {
      const bounds = monthBounds(attribution.businessMonth);
      return attribution.precision === "month_only"
        && safeAmount(attribution.amount) > 0
        && Boolean(bounds)
        && from <= bounds!.start
        && to >= bounds!.end;
    });
  });
}

export function calculatePeriodBusinessReport(orders: VillaOrder[], from?: string, to?: string) {
  const newOrders = ordersInRecordedDateRange(orders, from, to);
  const completedOrders = ordersCompletedInDateRange(orders, from, to);
  const verifiedEvents = verifiedCollectionEventsInDateRange(orders, from, to);
  const legacyAttributions = legacyCollectionAttributionsInDateRange(orders, from, to);
  const exactVerifiedCollected = verifiedEvents.reduce((sum, event) => sum + safeAmount(event.amount), 0);
  const legacyMonthAttributed = legacyAttributions.reduce((sum, attribution) => sum + safeAmount(attribution.amount), 0);
  const newBusinessMetrics = calculateAccountingMetrics(newOrders);
  const completedMetrics = calculateAccountingMetrics(completedOrders);
  return {
    newBusiness: {
      originalValue: newBusinessMetrics.originalTotal,
      discount: newBusinessMetrics.offersGiven,
      bookedSales: newBusinessMetrics.totalSales,
      newOrders: newOrders.length,
      bookedPets: newOrders.reduce((sum, order) => sum + order.pets.length, 0)
    },
    servicePerformance: {
      completedSales: completedMetrics.totalSales,
      completedOrders: completedOrders.length,
      completedPets: completedOrders.reduce((sum, order) => sum + order.pets.length, 0)
    },
    cashCollection: {
      collected: exactVerifiedCollected + legacyMonthAttributed,
      exactVerifiedCollected,
      legacyMonthAttributed,
      verifiedEvents: verifiedEvents.length,
      legacyAttributions: legacyAttributions.length
    }
  };
}

export function expensesInDateRange(expenses: BusinessExpense[], from?: string, to?: string) {
  return expenses.filter((expense) => Boolean(expense.expenseDate)
    && (!from || expense.expenseDate >= from)
    && (!to || expense.expenseDate <= to));
}

export function calculateExpenseMetrics(
  expenses: BusinessExpense[],
  overallCollected: number,
  periodCollected: number,
  from?: string,
  to?: string
) {
  const toSen = (value: number) => Math.round(safeAmount(value) * 100);
  const overallExpensesSen = expenses.reduce((sum, expense) => sum + toSen(expense.amount), 0);
  const periodExpensesSen = expensesInDateRange(expenses, from, to)
    .reduce((sum, expense) => sum + toSen(expense.amount), 0);
  const overallExpenses = overallExpensesSen / 100;
  const periodExpenses = periodExpensesSen / 100;
  return {
    overallExpenses,
    cashOnHand: (toSen(overallCollected) - overallExpensesSen) / 100,
    periodExpenses,
    periodNetCash: (toSen(periodCollected) - periodExpensesSen) / 100
  };
}

export function calculateAccountingMetrics(orders: VillaOrder[]) {
  const businessOrders = orders.filter(isBusinessOrder);
  const grossCollected = businessOrders.reduce((sum, order) => sum + collectedAmount(order), 0);
  const outstanding = businessOrders.reduce((sum, order) => sum + outstandingAmount(order), 0);
  return {
    originalTotal: businessOrders.reduce((sum, order) => sum + originalOrderAmount(order), 0),
    offersGiven: businessOrders.reduce((sum, order) => sum + discountAmount(order), 0),
    totalSales: grossCollected + outstanding,
    grossCollected,
    outstanding,
    settledOrders: businessOrders.filter(isSettledOrder).length,
  };
}

export function paidOrderCollections(orders: VillaOrder[]) {
  return orders
    .filter((order) => isBusinessOrder(order) && collectedAmount(order) > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
