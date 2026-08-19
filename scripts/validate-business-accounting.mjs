import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const helperPath = path.join(root, "apps/web/app/lib/businessAccounting.ts");
const source = fs.readFileSync(helperPath, "utf8");
const testableSource = source.replace(
  'import { isBusinessOrder } from "./safeVoid";',
  "const isBusinessOrder = (order) => !Boolean(order.voidedAt);"
);
const compiled = ts.transpileModule(testableSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const accounting = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function order(overrides) {
  return {
    orderId: "order-default",
    createdAt: "2026-08-10T10:00:00.000Z",
    total: 0,
    paid: 0,
    balance: 0,
    voucherDiscount: 0,
    status: "completed",
    pets: [],
    completedAt: null,
    checkedInAt: null,
    checkedInBusinessDate: null,
    paymentVerifications: [],
    legacyCollectionAttributions: [],
    ...overrides
  };
}

const productionRegression = [
  order({ orderId: "multi-pet", createdAt: "2026-08-08T17:15:00.000Z", total: 210, paid: 210, status: "completed" }),
  order({ orderId: "retained-1", createdAt: "2026-08-09T03:30:00.000Z", total: 105, paid: 105, status: "cancelled" }),
  order({ orderId: "retained-2", createdAt: "2026-08-09T15:59:59.999Z", total: 105, paid: 105, status: "cancelled" }),
  order({ orderId: "cancelled-unpaid", createdAt: "2026-08-09T08:00:00.000Z", total: 105, paid: 0, status: "cancelled" }),
  order({ orderId: "voided-test-record", createdAt: "2026-08-09T09:00:00.000Z", total: 999, paid: 999, status: "completed", voidedAt: "2026-08-10T01:00:00.000Z" })
];

const metrics = accounting.calculateAccountingMetrics(productionRegression);
assert.equal(metrics.grossCollected, 420, "Gross collected must include cancelled orders whose verified payment was retained.");
assert.equal(metrics.outstanding, 0, "Cancelled retained-payment orders must not create outstanding balances.");
assert.equal(metrics.settledOrders, 3, "Paid orders with no effective balance must be counted as settled.");
assert.equal(accounting.isPaymentRetained(productionRegression[1]), true);
assert.deepEqual(accounting.paidOrderCollections(productionRegression).map((item) => item.orderId), ["retained-2", "retained-1", "multi-pet"]);
assert.equal(accounting.collectedAmount(productionRegression[4]), 0, "Voided records must preserve their paid snapshot without entering business totals.");

const sameDayOrders = accounting.ordersInRecordedDateRange(productionRegression, "2026-08-09", "2026-08-09");
assert.equal(accounting.calculateAccountingMetrics(sameDayOrders).grossCollected, 420, "An inclusive same-day range must include every Aug 9 record in Asia/Kuala_Lumpur.");
const augustOrders = accounting.ordersInRecordedDateRange(productionRegression, "2026-08-08", "2026-08-31");
assert.equal(accounting.calculateAccountingMetrics(augustOrders).grossCollected, 420, "Both date-range boundaries must be inclusive.");
const emptyDayOrders = accounting.ordersInRecordedDateRange(productionRegression, "2026-08-10", "2026-08-10");
assert.equal(accounting.calculateAccountingMetrics(emptyDayOrders).grossCollected, 0, "A date without recorded orders must remain RM0.");

const outstandingRegression = [
  order({ orderId: "active-balance", total: 105, paid: 50, balance: 55, status: "confirmed" }),
  order({ orderId: "cancelled-balance-snapshot", total: 105, paid: 50, balance: 55, status: "cancelled" })
];
assert.equal(accounting.calculateAccountingMetrics(outstandingRegression).grossCollected, 100);
assert.equal(accounting.calculateAccountingMetrics(outstandingRegression).outstanding, 55, "Only active/effective balances are outstanding.");

const notPaidDisplay = accounting.getOrderPaymentDisplayStatus(order({ total: 210, paid: 0, balance: 210, status: "confirmed" }));
assert.equal(notPaidDisplay.label, "Not Paid");
assert.deepEqual({ paid: notPaidDisplay.paid, balance: notPaidDisplay.balance }, { paid: 0, balance: 210 });

const partiallyPaidDisplay = accounting.getOrderPaymentDisplayStatus(order({ total: 210, paid: 50, balance: 160, status: "balance" }));
assert.equal(partiallyPaidDisplay.label, "Partially Paid");
assert.deepEqual({ paid: partiallyPaidDisplay.paid, balance: partiallyPaidDisplay.balance }, { paid: 50, balance: 160 });

const fullyPaidDisplay = accounting.getOrderPaymentDisplayStatus(order({ total: 210, paid: 210, balance: 0, status: "completed" }));
assert.equal(fullyPaidDisplay.label, "Fully Paid");

const retainedDisplay = accounting.getOrderPaymentDisplayStatus(order({ total: 105, paid: 105, balance: 0, status: "cancelled" }));
assert.equal(retainedDisplay.label, "Payment Retained");
assert.equal(retainedDisplay.paid, 105);

const pendingDisplay = accounting.getOrderPaymentDisplayStatus(order({
  total: 210,
  paid: 50,
  balance: 160,
  status: "pending_verification",
  paymentSubmission: { amount: 160, method: "qr", submittedAt: "2026-08-10T10:00:00.000Z" }
}));
assert.equal(pendingDisplay.label, "Pending Verification");
assert.equal(pendingDisplay.paid, 50, "A submitted amount must not be presented as verified paid money.");

const clampedDisplay = accounting.getOrderPaymentDisplayStatus(order({ total: 210, paid: 215, balance: -5, status: "confirmed" }));
assert.equal(clampedDisplay.label, "Fully Paid");
assert.equal(clampedDisplay.balance, 0, "Negative stored balances must render as RM0 without changing the database.");

const discountedOrder = order({ subtotal: 210, total: 180, paid: 50, balance: 130, voucherDiscount: 10, manualDiscount: 20, status: "balance" });
const discountedMetrics = accounting.calculateAccountingMetrics([discountedOrder]);
assert.deepEqual(
  {
    originalTotal: discountedMetrics.originalTotal,
    offersGiven: discountedMetrics.offersGiven,
    totalSales: discountedMetrics.totalSales,
    collected: discountedMetrics.grossCollected,
    outstanding: discountedMetrics.outstanding
  },
  { originalTotal: 210, offersGiven: 30, totalSales: 180, collected: 50, outstanding: 130 },
  "Original total, combined discounts, sales, collected and outstanding must reconcile."
);

const legacyVoucherOrder = order({ subtotal: 0, total: 60, paid: 60, balance: 0, voucherDiscount: 10 });
assert.equal(accounting.originalOrderAmount(legacyVoucherOrder), 70, "Historical voucher discounts must remain visible when an older order has no subtotal snapshot.");
assert.equal(accounting.discountAmount(legacyVoucherOrder), 10);

const lifecycleOrder = order({
  orderId: "three-cohort-order",
  createdAt: "2026-08-28T02:00:00.000Z",
  completedAt: "2026-09-03T04:30:00.000Z",
  subtotal: 150,
  total: 140,
  paid: 140,
  balance: 0,
  voucherDiscount: 10,
  status: "completed",
  pets: [{ id: "pet-a" }, { id: "pet-b" }],
  paymentVerifications: [
    { amount: 50, mode: "submission", verifiedAt: "2026-08-28T03:00:00.000Z" },
    { amount: 90, mode: "balance", verifiedAt: "2026-09-03T04:00:00.000Z" }
  ]
});
const augustReport = accounting.calculatePeriodBusinessReport([lifecycleOrder], "2026-08-01", "2026-08-31");
assert.deepEqual(augustReport.newBusiness, {
  originalValue: 150,
  discount: 10,
  bookedSales: 140,
  newOrders: 1,
  bookedPets: 2
}, "New Business must use the order recorded date.");
assert.deepEqual(augustReport.servicePerformance, {
  completedSales: 0,
  completedOrders: 0,
  completedPets: 0
}, "A later checkout must not enter the order-recorded month completion cohort.");
assert.deepEqual(augustReport.cashCollection, {
  collected: 50,
  exactVerifiedCollected: 50,
  legacyMonthAttributed: 0,
  verifiedEvents: 1,
  legacyAttributions: 0
}, "Cash Collection must use the real Host verification timestamp.");

const septemberReport = accounting.calculatePeriodBusinessReport([lifecycleOrder], "2026-09-01", "2026-09-30");
assert.equal(septemberReport.newBusiness.newOrders, 0);
assert.deepEqual(septemberReport.servicePerformance, {
  completedSales: 140,
  completedOrders: 1,
  completedPets: 2
}, "Service Performance must use the actual persisted completion timestamp.");
assert.deepEqual(septemberReport.cashCollection, {
  collected: 90,
  exactVerifiedCollected: 90,
  legacyMonthAttributed: 0,
  verifiedEvents: 1,
  legacyAttributions: 0
});

const submittedOnly = order({
  orderId: "submitted-not-verified",
  total: 105,
  paid: 0,
  balance: 105,
  status: "pending_verification",
  paymentSubmission: { amount: 50, method: "qr", submittedAt: "2026-08-28T06:00:00.000Z" }
});
assert.equal(
  accounting.calculatePeriodBusinessReport([submittedOnly], "2026-08-01", "2026-08-31").cashCollection.collected,
  0,
  "A Customer-submitted payment must not count as Host-verified collection."
);

const voidedVerified = order({
  orderId: "voided-verified",
  voidedAt: "2026-08-29T01:00:00.000Z",
  paid: 105,
  paymentVerifications: [{ amount: 105, mode: "submission", verifiedAt: "2026-08-28T08:00:00.000Z" }]
});
assert.equal(
  accounting.calculatePeriodBusinessReport([voidedVerified], "2026-08-01", "2026-08-31").cashCollection.collected,
  0,
  "Voided payment events must remain outside business reporting."
);

const augustLegacyOrders = [
  order({ orderId: "kay", total: 70, paid: 70, pets: [{ id: "wilma" }], checkedInBusinessDate: "2026-08-08", completedAt: "2026-08-09T00:00:00+08:00", legacyCollectionAttributions: [{ amount: 70, businessMonth: "2026-08", precision: "month_only", attributedAt: "2026-08-13T00:00:00Z" }] }),
  order({ orderId: "john", total: 140, paid: 140, pets: [{ id: "qq" }, { id: "miloky" }], checkedInBusinessDate: "2026-08-08", completedAt: "2026-08-09T00:00:00+08:00", legacyCollectionAttributions: [{ amount: 140, businessMonth: "2026-08", precision: "month_only", attributedAt: "2026-08-13T00:00:00Z" }] }),
  order({ orderId: "mong", total: 140, paid: 140, pets: [{ id: "girlgirl" }, { id: "bb" }], checkedInAt: "2026-08-11T15:54:53.000Z", completedAt: "2026-08-12T15:14:29.000Z", paymentVerifications: [{ amount: 110, mode: "submission", verifiedAt: "2026-08-11T10:00:00.000Z" }], legacyCollectionAttributions: [{ amount: 30, businessMonth: "2026-08", precision: "month_only", attributedAt: "2026-08-13T00:00:00Z" }] }),
  order({ orderId: "vincent", total: 70, paid: 50, balance: 20, pets: [{ id: "xiatian" }], status: "staying", checkedInAt: "2026-08-11T15:54:28.000Z", legacyCollectionAttributions: [{ amount: 50, businessMonth: "2026-08", precision: "month_only", attributedAt: "2026-08-13T00:00:00Z" }] }),
  order({ orderId: "stanly", total: 70, paid: 50, balance: 20, pets: [{ id: "olaf" }], status: "balance", legacyCollectionAttributions: [{ amount: 50, businessMonth: "2026-08", precision: "month_only", attributedAt: "2026-08-13T00:00:00Z" }] })
];
const fullAugustCash = accounting.calculatePeriodBusinessReport(augustLegacyOrders, "2026-08-01", "2026-08-31").cashCollection;
assert.deepEqual(fullAugustCash, {
  collected: 450,
  exactVerifiedCollected: 110,
  legacyMonthAttributed: 340,
  verifiedEvents: 1,
  legacyAttributions: 5
}, "August collection must reconcile exact RM110 plus owner-confirmed month-only RM340 without duplication.");
assert.equal(accounting.calculatePeriodBusinessReport(augustLegacyOrders, "2026-08-01", "2026-08-15").cashCollection.collected, 110, "A partial month must not fabricate a day for month-only attribution.");
assert.equal(accounting.calculatePeriodBusinessReport(augustLegacyOrders, "2026-08-09", "2026-08-09").cashCollection.collected, 0, "A day range must not include month-only attribution.");
assert.equal(accounting.ordersCheckedInInDateRange(augustLegacyOrders, "2026-08-01", "2026-08-31").length, 4, "Only four real check-in events belong to August.");
assert.equal(accounting.ordersCompletedInDateRange(augustLegacyOrders, "2026-08-01", "2026-08-31").length, 3, "Only three real check-out/completion events belong to August.");
const augustOperationalReport = accounting.calculatePeriodBusinessReport(augustLegacyOrders, "2026-08-01", "2026-08-31");
assert.equal(augustOperationalReport.newBusiness.newOrders, 5);
assert.equal(augustOperationalReport.newBusiness.bookedPets, 7);
assert.deepEqual(augustOperationalReport.servicePerformance, { completedSales: 350, completedOrders: 3, completedPets: 5 });
assert.equal(accounting.calculateExpenseMetrics([{ expenseDate: "2026-08-12", amount: 111.89 }], 450, 450, "2026-08-01", "2026-08-31").periodNetCash, 338.11);
assert.deepEqual(
  { collected: accounting.calculateAccountingMetrics(augustLegacyOrders).grossCollected, outstanding: accounting.calculateAccountingMetrics(augustLegacyOrders).outstanding },
  { collected: 450, outstanding: 40 },
  "Reporting attribution must not mutate overall collection or outstanding semantics."
);

console.log("PASS Gross collected includes verified retained payments (RM420 regression)");
console.log("PASS Cancelled orders do not inflate outstanding balances");
console.log("PASS Settled order count has an explicit order-count meaning");
console.log("PASS Order-level collection history includes every paid order");
console.log("PASS Same-day recorded range is inclusive in Asia/Kuala_Lumpur (RM420 regression)");
console.log("PASS Host payment display states are truthful and clamp negative balances");
console.log("PASS Voided financial snapshots are excluded from business accounting");
console.log("PASS Original total, discounts, total sales, collected and outstanding reconcile");
console.log("PASS Historical voucher discounts remain included in Offers Given");
console.log("PASS Period report separates order recorded, actual completion and Host verification dates");
console.log("PASS Submitted payments and voided records do not enter verified period collections");
console.log("PASS August cash reconciles exact RM110 plus month-only RM340 without duplicate collection");
console.log("PASS Month-only attribution is excluded from day, week and partial-month ranges");
console.log("PASS Dashboard actual operations reconcile to 4 check-ins and 3 check-outs");
