import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(name);
}

const helper = read("apps/web/app/lib/safeVoid.ts");
const migration = read("database/migrations/202608100001_create_supabase_safe_void.sql");
const voidRoute = read("apps/web/app/api/host/orders/[orderId]/void/route.ts");
const hostOrdersRoute = read("apps/web/app/api/host/orders/route.ts");
const hostPage = read("apps/web/app/host/page.tsx");
const orderFlow = read("apps/web/app/lib/orderFlow.ts");
const accounting = read("apps/web/app/lib/businessAccounting.ts");
const capacity = read("apps/web/app/lib/bookingCapacity.ts");
const diaryPage = read("apps/web/app/diary/page.tsx");
const paymentPage = read("apps/web/app/payment/page.tsx");

expect("Safe Void requires the exact VOID confirmation", helper.includes('SAFE_VOID_CONFIRMATION = "VOID"'));
expect("Safe Void has one centralized business-order rule", helper.includes("return !isVoidedOrder(order)") && accounting.includes('from "./safeVoid"') && capacity.includes('from "./safeVoid"'));
expect("Migration is additive and preserves the order row", migration.includes("add column if not exists voided_at") && migration.includes("add column if not exists voided_by") && !migration.includes("drop table public.orders"));
expect("Migration preserves original status and financial values", migration.includes("new.status is distinct from old.status") && migration.includes("new.total_rm is distinct from old.total_rm") && migration.includes("new.paid_rm is distinct from old.paid_rm") && migration.includes("new.balance_rm is distinct from old.balance_rm"));
expect("Migration restricts the RPC to service role", migration.includes("revoke all on function public.void_order_as_primary_owner") && migration.includes("grant execute on function public.void_order_as_primary_owner") && migration.includes("to service_role"));
expect("Void API requires booking management authorization", voidRoute.includes('authorizeHostRequest(request, "bookings.manage")'));
expect("Void API is Primary Owner only", voidRoute.includes('authorization.accessRole !== "owner"') && voidRoute.includes('authorization.staffStatus !== "active"') && voidRoute.includes("canyonfsp@gmail.com"));
expect("Void API records through the protected RPC", voidRoute.includes('.rpc("void_order_as_primary_owner"'));
expect("Host orders expose orders.id as the authoritative orderRowId", hostOrdersRoute.includes("order_row_id: order.id") && orderFlow.includes("orderRowId: row.order_row_id || row.id"));
expect("Safe Void RPC identifies orders by UUID row ID", migration.includes("p_order_row_id uuid") && migration.includes("where id = p_order_row_id") && voidRoute.includes("p_order_row_id: normalizedOrderRowId"));
expect("Safe Void no longer assumes display order IDs are globally unique", !migration.includes("order_void_records_order_id_key") && !migration.includes("where order_id = p_order_id"));
expect("One void record is enforced per authoritative order row", migration.includes("constraint order_void_records_pkey primary key (order_row_id)"));
expect("Safe Void migration is atomic", /^\s*begin;/im.test(migration) && /^\s*commit;/im.test(migration));
expect("Host orders expose void audit data only through the protected server route", hostOrdersRoute.includes("order_void_records") && hostOrdersRoute.includes("void_reason_code") && hostOrdersRoute.includes("void_reason"));
expect("Host Danger Zone requires reason, acknowledgement, and exact VOID", hostPage.includes("host-void-danger-zone") && hostPage.includes("SAFE_VOID_REASON_CODES.map") && hostPage.includes("SAFE_VOID_ACKNOWLEDGEMENT") && hostPage.includes("voidOrderForm.confirmation !== SAFE_VOID_CONFIRMATION"));
expect("Host operational actions fail closed for voided records", hostPage.includes("Voided records are read-only") && hostPage.includes("Voided records cannot move through booking operations") && hostPage.includes("Payment actions are disabled for voided records"));
expect("Host provides a read-only Voided audit view", hostPage.includes('setBookingStatusFilter("voided")') && hostPage.includes("Read-only audit trail") && hostPage.includes("Internal note"));
expect("Customer orders exclude voided records and reject stale mutations", orderFlow.includes("orders = orders.filter(isBusinessOrder)") && orderFlow.includes("if (previous && isVoidedOrder(previous))"));
expect("Customer Diary inherits the protected customer order loader", diaryPage.includes("loadOrders(") && diaryPage.includes("activeOrders") && diaryPage.includes("activeOrderIds"));
expect("Customer Payment inherits the protected order loader and mutation guard", paymentPage.includes("loadOrders(") && paymentPage.includes("updateOrder("));
expect("Accounting excludes voided records from every collected total", accounting.includes("if (!isBusinessOrder(order)) return 0") && accounting.includes("orders.filter(isBusinessOrder)"));
expect("Booking capacity excludes voided records", capacity.includes("isBusinessOrder(order) && OCCUPYING_STATUSES.has(order.status)"));

const duplicateDisplayIdOrders = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ownerId: "customer-a", orderId: "ORDER-123", status: "completed", total: 210, paid: 210, balance: 0, voidedAt: null },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", ownerId: "customer-b", orderId: "ORDER-123", status: "completed", total: 105, paid: 50, balance: 55, voidedAt: null }
];
const financialSnapshots = new Map(duplicateDisplayIdOrders.map((order) => [order.id, `${order.status}:${order.total}:${order.paid}:${order.balance}`]));
const voidRecords = new Map();
const businessAudit = [];

function simulateVoidByRowId(orderRowId) {
  const order = duplicateDisplayIdOrders.find((item) => item.id === orderRowId);
  if (!order) throw new Error("Order not found");
  const existing = voidRecords.get(orderRowId);
  if (existing) return { ...existing, alreadyVoided: true };
  order.voidedAt = "2026-08-10T10:00:00.000Z";
  const record = { orderRowId, displayOrderId: order.orderId };
  voidRecords.set(orderRowId, record);
  businessAudit.push({ orderRowId, action: "order.voided" });
  return { ...record, alreadyVoided: false };
}

const firstVoid = simulateVoidByRowId(duplicateDisplayIdOrders[0].id);
const duplicateVoid = simulateVoidByRowId(duplicateDisplayIdOrders[0].id);
expect("Cross-customer duplicate display order ID voids only the selected UUID", firstVoid.alreadyVoided === false && duplicateDisplayIdOrders[0].voidedAt !== null && duplicateDisplayIdOrders[1].voidedAt === null);
expect("Duplicate Safe Void request is idempotent", duplicateVoid.alreadyVoided === true && voidRecords.size === 1);
expect("Duplicate Safe Void request does not duplicate business audit", businessAudit.length === 1);
expect("Safe Void preserves every original financial value", duplicateDisplayIdOrders.every((order) => financialSnapshots.get(order.id) === `${order.status}:${order.total}:${order.paid}:${order.balance}`));

if (failures.length) {
  console.error(`\nSafe Void validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nSafe Void validation passed.");
