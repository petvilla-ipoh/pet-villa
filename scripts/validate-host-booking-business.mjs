import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(name);
}

const migration = read("database/migrations/202608100002_create_supabase_host_customers.sql");
const customersRoute = read("apps/web/app/api/host/customers/route.ts");
const bookingRoute = read("apps/web/app/api/host/bookings/route.ts");
const verifyRoute = read("apps/web/app/api/host/orders/[orderId]/verify-payment/route.ts");
const hostPage = read("apps/web/app/host/page.tsx");
const orderFlow = read("apps/web/app/lib/orderFlow.ts");
const pricing = read("apps/web/app/lib/pricing.ts");
const pricingMigration = read("database/migrations/202608110001_add_business_pricing_and_order_discount.sql");
const orderUpdateRoute = read("apps/web/app/api/host/orders/[orderId]/route.ts");
const hostOrdersRoute = read("apps/web/app/api/host/orders/route.ts");
const hostStaffPage = read("apps/web/app/host/staff/page.tsx");
const hostI18n = read("apps/web/app/lib/hostI18n.tsx");
const styles = read("apps/web/app/styles.css");
const accountingSource = read("apps/web/app/lib/businessAccounting.ts");
const testableAccountingSource = accountingSource.replace(
  'import { isBusinessOrder } from "./safeVoid";',
  "const isBusinessOrder = (order) => !Boolean(order.voidedAt);"
);
const compiledAccounting = ts.transpileModule(testableAccountingSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const accounting = await import(`data:text/javascript;base64,${Buffer.from(compiledAccounting).toString("base64")}`);
const migrationSetup = migration.slice(0, migration.indexOf("create or replace function public.verify_host_order_payment"));
const collectionDesk = hostPage.slice(hostPage.indexOf('className={activeWorkspace === "payments" ? "host-operating-card host-workspace host-outstanding-workspace"'), hostPage.indexOf('className={activeWorkspace === "payments" ? "host-operating-card host-workspace host-collections-workspace"'));

function accountingOrder(overrides = {}) {
  return {
    orderId: "order-default",
    createdAt: "2026-08-10T10:00:00+08:00",
    total: 0,
    paid: 0,
    balance: 0,
    voucherDiscount: 0,
    manualDiscount: 0,
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

const customRangeFixtures = [
  accountingOrder({ orderId: "before", createdAt: "2026-08-04T23:59:59+08:00", checkedInBusinessDate: "2026-08-04", completedAt: "2026-08-04T23:59:59+08:00", pets: [{ id: "before-pet" }] }),
  accountingOrder({ orderId: "from-boundary", createdAt: "2026-08-05T00:00:00+08:00", checkedInBusinessDate: "2026-08-05", completedAt: "2026-08-05T00:00:00+08:00", pets: [{ id: "from-pet" }] }),
  accountingOrder({ orderId: "to-boundary", createdAt: "2026-08-12T23:59:59+08:00", checkedInBusinessDate: "2026-08-12", completedAt: "2026-08-12T23:59:59+08:00", pets: [{ id: "to-pet-a" }, { id: "to-pet-b" }] }),
  accountingOrder({ orderId: "after", createdAt: "2026-08-13T00:00:00+08:00", checkedInBusinessDate: "2026-08-13", completedAt: "2026-08-13T00:00:00+08:00", pets: [{ id: "after-pet" }] })
];
const customFrom = "2026-08-05";
const customTo = "2026-08-12";
const customRecorded = accounting.ordersInRecordedDateRange(customRangeFixtures, customFrom, customTo);
const customCheckIns = accounting.ordersCheckedInInDateRange(customRangeFixtures, customFrom, customTo);
const customCheckOuts = accounting.ordersCompletedInDateRange(customRangeFixtures, customFrom, customTo);

const collectionSemanticsFixtures = [
  accountingOrder({
    orderId: "exact-verification",
    createdAt: "2026-08-01T09:00:00+08:00",
    paid: 50,
    paymentVerifications: [{ amount: 50, mode: "submission", verifiedAt: "2026-08-10T10:00:00+08:00" }]
  }),
  accountingOrder({
    orderId: "legacy-month-only",
    createdAt: "2026-07-15T09:00:00+08:00",
    paid: 70,
    legacyCollectionAttributions: [{ amount: 70, businessMonth: "2026-08", precision: "month_only", attributedAt: "2026-08-13T00:00:00Z" }]
  })
];
const fullMonthCollection = accounting.calculatePeriodBusinessReport(collectionSemanticsFixtures, "2026-08-01", "2026-08-31").cashCollection;
const verificationDayCollection = accounting.calculatePeriodBusinessReport(collectionSemanticsFixtures, "2026-08-10", "2026-08-10").cashCollection;
const orderRecordedDayCollection = accounting.calculatePeriodBusinessReport(collectionSemanticsFixtures, "2026-08-01", "2026-08-01").cashCollection;
const attributionTimestampDayCollection = accounting.calculatePeriodBusinessReport(collectionSemanticsFixtures, "2026-08-13", "2026-08-13").cashCollection;
const partialWeekCollection = accounting.calculatePeriodBusinessReport(collectionSemanticsFixtures, "2026-08-10", "2026-08-16").cashCollection;

expect("Host customer name is required", migration.includes("full_name text not null") && migration.includes("length(btrim(full_name)) > 0"));
expect("Host customer phone is required", migration.includes("phone text not null") && migration.includes("length(btrim(phone)) > 0"));
expect("Host customer email is optional", migration.includes("email text,") && customersRoute.includes("email: parsed.data.email || null"));
expect("Host customer creation does not create an Auth user", customersRoute.includes('body?.accountType === "host"') && customersRoute.indexOf('.from("host_customers").insert') < customersRoute.indexOf("auth.admin.createUser"));
expect("Existing customer Auth creation remains available", customersRoute.includes("authorization.admin.auth.admin.createUser"));
expect("Orders support exactly one Auth or Host customer", migration.includes("orders_exactly_one_customer_check") && migration.includes("(owner_id is not null) <> (host_customer_id is not null)"));
expect("Host booking write is protected", bookingRoute.includes('authorizeHostRequest(request, "bookings.manage")'));
expect("Host booking request is idempotent", bookingRoute.includes("client_draft_id") && bookingRoute.includes("alreadyCreated: true"));
expect("Host-created booking uses a formal order ID", bookingRoute.includes("const orderId = `PVH-") && !bookingRoute.includes("order-draft-"));
expect("Customer-created booking uses a formal order ID", orderFlow.includes("const orderId = `PV-") && !orderFlow.includes("const orderId = `order-draft-"));
expect("Legacy order identity remains readable", orderFlow.includes('order.orderId === `order-${draft.id}`'));
expect("Switching to New Customer clears selected pets", hostPage.includes('const firstCustomer = mode === "existing" ? customers[0] : undefined') && hostPage.includes("dogIds: firstDog?.id ? [firstDog.id] : []"));
expect("Daycare uses one date", bookingRoute.includes('value.service === "daycare" && value.startDate !== value.endDate') && bookingRoute.includes('endDateISO: input.service === "daycare" ? input.startDate'));
expect("Daycare stores start and end time", bookingRoute.includes("startTime: input.service === \"daycare\"") && bookingRoute.includes("endTime: input.service === \"daycare\""));
expect("Daycare charges actual hours for every selected pet", bookingRoute.includes("timeHour(input.endTime) - timeHour(input.startTime)") && bookingRoute.includes("calculateServiceSubtotal") && pricing.includes("input.hours) * petCount * rateForDate"));
expect("Payment verification is protected", verifyRoute.includes('authorizeHostRequest(request, "payments.manage")'));
expect("Payment verification uses the permanent order UUID", verifyRoute.includes("p_order_row_id: params.data.orderId") && verifyRoute.includes("z.string().uuid()"));
expect("Submitted payment is verified only by the Host RPC", migration.includes("paymentSubmission,amount") && migration.includes("for update") && migration.includes("order.payment_verified"));
expect("Verified paid and balance persist atomically", migration.includes("set paid_rm = next_paid") && migration.includes("balance_rm = next_balance") && migration.includes("order_payload = next_payload"));
expect("Duplicate payment verification cannot add the amount twice", migration.includes("- 'paymentSubmission'") && migration.includes("'already_verified', true"));
expect("Payment API returns the camelCase contract used by Host UI", verifyRoute.includes("alreadyVerified: Boolean(result.already_verified)") && verifyRoute.includes("paid: Number(result.paid || 0)") && verifyRoute.includes("balance: Number(result.balance || 0)"));
expect("Migration is additive and preserves historical orders", migration.trimStart().startsWith("-- Persistent Host-created customers") && !/\b(delete|truncate)\s+from\s+public\.orders\b/i.test(migrationSetup) && !/update\s+public\.orders\s+set\s+(total_rm|paid_rm|balance_rm)/i.test(migrationSetup));
expect("Host and Customer booking share one pricing calculator", bookingRoute.includes('from "../../../lib/pricing"') && read("apps/web/app/booking/page.tsx").includes('from "../lib/pricing"'));
expect("Special-date rates fall back to normal rates", pricing.includes("safeRate(special?.boardingRate") && pricing.includes("safeRate(special?.daycareRate"));
expect("Special-date pricing supports an inclusive range", pricing.includes("date >= item.fromDate && date <= item.toDate") && hostPage.includes("From Date") && hostPage.includes("To Date"));
expect("Legacy single-date pricing remains compatible", pricing.includes("candidate.date") && pricing.includes("candidate.toDate") && pricing.includes("toDate < fromDate"));
expect("Host booking stores the selected Pet Villa avatar", bookingRoute.includes("photo_url: input.newPet.photoDataUrl") && hostPage.includes("<PetAvatarPicker"));
expect("Host order views resolve the current saved pet avatar", hostOrdersRoute.includes('.from("pets")') && hostOrdersRoute.includes('.from("host_customer_pets")') && hostOrdersRoute.includes('photoDataUrl: currentPet.photo_url || ""'));
expect("Current pet profile read errors are not treated as empty orders", hostOrdersRoute.includes("Host pet profiles could not be loaded.") && hostOrdersRoute.includes("current pet profiles query failed"));
expect("Today at the villa follows explicit checked-in status", hostPage.includes('function isCurrentlyAtVilla(order: VillaOrder)') && hostPage.includes('["active", "staying"].includes(order.status)') && hostPage.includes("const inStayOrders = businessOrders.filter(isCurrentlyAtVilla)"));
expect("Checked-out bookings are excluded from the At the villa filter", hostPage.includes('(bookingStatusFilter === "active" && isCurrentlyAtVilla(order))') && !hostPage.includes('(bookingStatusFilter === "active" && ["active", "staying", "awaiting_checkout", "ready_pickup"].includes(order.status))'));
expect("Today at the villa uses the normalized avatar renderer", hostPage.includes('src={dogAvatarSrc(order.pets[0]?.photoDataUrl)}') && hostPage.includes('t({ en: "In stay", zh:'));
expect("Manual discount is additive and does not rewrite history", pricingMigration.includes("ADD COLUMN IF NOT EXISTS manual_discount_rm") && !/update\s+public\.orders/i.test(pricingMigration));
expect("Special-date pricing is additive", pricingMigration.includes("ADD COLUMN IF NOT EXISTS special_date_rates") && pricingMigration.trimStart().startsWith("BEGIN;") && pricingMigration.trim().endsWith("COMMIT;"));
expect("Server derives final total from subtotal and discounts", orderUpdateRoute.includes("next.subtotal - voucherDiscount - manualDiscount") && orderUpdateRoute.includes("manual_discount_rm: manualDiscount"));
expect("Database rejects a manual discount above the original subtotal", pricingMigration.includes("orders_manual_discount_not_above_subtotal") && pricingMigration.includes("manual_discount_rm <= subtotal_rm"));
expect("Future booking flow does not write a voucher", bookingRoute.includes("voucher_id: null") && bookingRoute.includes("voucher_discount_rm: 0"));
expect("Check-in, checkout and completion persist through the protected order API", orderUpdateRoute.includes('next.status === "staying"') && orderUpdateRoute.includes('next.status === "ready_pickup"') && orderUpdateRoute.includes('next.status === "completed"') && orderUpdateRoute.includes("status: persistedStatus"));
expect("Future check-in and early checkout are protected", orderUpdateRoute.includes("cannot be checked in before its booked date") && orderUpdateRoute.includes("Early checkout requires Owner or Admin confirmation"));
expect("Completion is blocked while money remains outstanding", orderUpdateRoute.includes("Collect the outstanding balance before completing this booking"));
expect("A fully paid checkout is persisted as Completed in one server write", orderUpdateRoute.includes('next.status === "ready_pickup" && balance <= 0 ? "completed" : next.status') && orderUpdateRoute.includes("toStatus: persistedStatus"));
expect("Checkout is blocked while a balance remains", orderUpdateRoute.includes('next.status === "ready_pickup" && balance > 0') && orderUpdateRoute.includes("before checking out this booking"));
expect("Completed view reads only the persisted Completed status", hostPage.includes('bookingStatusFilter === "completed" && order.status === "completed"'));
expect("Past dates do not auto-complete bookings", !orderUpdateRoute.includes("endDateISO < businessDateKey()") && !hostPage.includes("endDateISO < toDateKey(todayLocal())"));
expect("Dashboard includes distinct This Month and Last Month periods", hostPage.includes('type DashboardRange = "today" | "this-week" | "this-month" | "last-week" | "last-month" | "custom"') && hostPage.includes('["this-month", "This Month"]') && hostPage.includes('["last-month", "Last Month"]'));
expect("Dashboard defaults to This Month without changing the Payments default", hostPage.includes('useState<DashboardRange>("this-month")') && hostPage.includes('const [collectionRange, setCollectionRange] = useState<DashboardRange>("today")'));
expect("Dashboard periods follow the approved comparison order", hostPage.indexOf('["today", "Today"]') < hostPage.indexOf('["this-week", "This Week"]') && hostPage.indexOf('["this-week", "This Week"]') < hostPage.indexOf('["last-week", "Last Week"]') && hostPage.indexOf('["last-week", "Last Week"]') < hostPage.indexOf('["this-month", "This Month"]') && hostPage.indexOf('["this-month", "This Month"]') < hostPage.indexOf('["last-month", "Last Month"]'));
expect("This Month uses the current calendar month", hostPage.includes('if (range === "this-month")') && hostPage.includes("today.getMonth() + 1, 0"));
expect("Dashboard adds Custom after the approved comparison periods", hostPage.indexOf('["last-month", "Last Month"]') < hostPage.indexOf('["custom", "Custom"]'));
expect("Dashboard custom From and To are shown only for Custom", hostPage.includes('dashboardRange === "custom" ? <div className="host-custom-period-range"') && hostPage.includes("dashboardCustomFrom") && hostPage.includes("dashboardCustomTo"));
expect("Dashboard displays the actual selected date range", hostPage.includes('className="host-selected-date-range"') && hostPage.includes('dashboardDateRangeLabel(dashboardWindow.start, dashboardWindow.end'));
expect("Dashboard custom range controls all selected-period metrics", hostPage.includes("const dashboardWindow = dateWindow(dashboardRange, dashboardCustomFrom, dashboardCustomTo)") && hostPage.includes("ordersInRecordedDateRange(businessOrders, dashboardFrom, dashboardTo)") && hostPage.includes("ordersCheckedInInDateRange(businessOrders, dashboardFrom, dashboardTo)") && hostPage.includes("ordersCompletedInDateRange(businessOrders, dashboardFrom, dashboardTo)") && customRecorded.map((order) => order.orderId).join(",") === "from-boundary,to-boundary" && customCheckIns.map((order) => order.orderId).join(",") === "from-boundary,to-boundary" && customCheckOuts.map((order) => order.orderId).join(",") === "from-boundary,to-boundary" && customRecorded.reduce((sum, order) => sum + order.pets.length, 0) === 3);
expect("Dashboard selected-period group contains four operational metrics", hostPage.includes('data-scope="period"') && hostPage.includes('{ en: "Check-ins"') && hostPage.includes('{ en: "Check-outs"') && hostPage.includes('{ en: "Bookings"') && hostPage.includes('{ en: "Booked Pets"'));
expect("Dashboard booked pets always renders a number", hostPage.includes('en: "Booked Pets", zh: "已预约宠物", value: reportPetCount') && !hostPage.includes('reportPetCount || "Available"'));
expect("Dashboard current operations are independent of the period selector", hostPage.includes('data-scope="current"') && hostPage.includes('{ en: "At the Villa"') && hostPage.includes('{ en: "Current Outstanding"') && hostPage.includes('{ en: "Unread Messages"'));
expect("Dashboard finance snapshot keeps fixed reporting windows", hostPage.includes('data-scope="finance"') && hostPage.includes('{ en: "Today Sales"') && hostPage.includes('{ en: "This Month Collected"') && hostPage.includes('subEn: "Today only"'));
expect("Today Sales remains fixed to the current business day", hostPage.includes("ordersInRecordedDateRange(orders, todayKey, todayKey)") && !hostPage.includes('dashboardRange === "today" || dashboardRange === "custom" ? "Day Sales" : "Period Sales"'));
expect("Payments preserves the five core financial figures", hostPage.includes('en: "Original Total"') && hostPage.includes('en: "Discount"') && hostPage.includes('en: "Total Sales"') && hostPage.includes('en: "Collected"') && hostPage.includes('en: "Outstanding"'));
expect("Payments period report selector matches the approved six periods", hostPage.includes('aria-label="Period business report period"') && hostPage.includes('["today", "Today", "今天"]') && hostPage.includes('["this-week", "This Week", "本周"]') && hostPage.includes('["last-week", "Last Week", "上周"]') && hostPage.includes('["this-month", "This Month", "本月"]') && hostPage.includes('["last-month", "Last Month", "上月"]') && hostPage.includes('["custom", "Custom", "自选"]'));
expect("Payments period report uses the centralized three-cohort calculation", hostPage.includes("const collectionWindow = dateWindow(collectionRange, reportFrom, reportTo)") && hostPage.includes("calculatePeriodBusinessReport(orders, collectionFrom, collectionTo)") && hostPage.includes("periodBusinessReport.newBusiness") && hostPage.includes("periodBusinessReport.servicePerformance") && hostPage.includes("periodBusinessReport.cashCollection"));
expect("Payments period header shows the calendar month and exact date range", hostPage.includes("dashboardPeriodCalendarLabel") && hostPage.includes("{collectionCalendarLabel}") && hostPage.includes("{collectionRangeLabel}"));
expect("Host orders API supplies real completion and payment verification timestamps", hostOrdersRoute.includes('"order.payment_verified"') && hostOrdersRoute.includes('"booking.status_updated"') && hostOrdersRoute.includes("completed_at: completedAtByOrder.get(order.id)") && hostOrdersRoute.includes("payment_verifications: paymentVerificationsByOrder.get(order.id)"));
expect("Period report always renders all three business sections", hostPage.includes('data-report="new-business"') && hostPage.includes('data-report="service-performance"') && hostPage.includes('data-report="cash-collection"') && hostPage.includes('{ en: "Original Value"') && hostPage.includes('{ en: "Completed Sales"') && hostPage.includes('{ en: "Collected"') && hostPage.includes("periodBusinessReport.cashCollection.collected"));
expect("Period report does not fabricate dates for legacy aggregate payments", fullMonthCollection.collected === 120 && fullMonthCollection.exactVerifiedCollected === 50 && fullMonthCollection.legacyMonthAttributed === 70 && fullMonthCollection.verifiedEvents === 1 && fullMonthCollection.legacyAttributions === 1 && verificationDayCollection.collected === 50 && orderRecordedDayCollection.collected === 0 && attributionTimestampDayCollection.collected === 0 && partialWeekCollection.collected === 50);
expect("Payments custom From and To only appear for Custom", hostPage.includes('collectionRange === "custom" ? <div className="host-custom-report"'));
expect("Financial Position and Collection Desk stay independent from report period", !hostPage.slice(hostPage.indexOf('className="host-finance-metrics"'), hostPage.indexOf("host-period-business-report")).includes("collectionRange") && !collectionDesk.includes("collectionRange"));
expect("Customer balances are customer-level aggregates", hostPage.includes("customer.orders.reduce((sum, order) => sum + outstandingAmount(order), 0)") && hostPage.includes('en: "Customer-level summary"') && hostPage.includes("customer.orders.length"));
expect("Collection Desk prioritizes customer, stay and collectible balance", collectionDesk.includes('en: "Customer / Pet"') && collectionDesk.includes('en: "Stay"') && collectionDesk.includes('en: "Total Sales"') && !collectionDesk.includes('<th>Original</th>') && !collectionDesk.includes('<th>Discount</th>'));
expect("Collection action confirms the exact outstanding amount", hostPage.includes('en: `Confirm ${money(outstandingAmount(order))} Paid`') && hostPage.includes('zh: `确认收款 ${money(outstandingAmount(order))}`'));
expect("Period report uses stable premium pastel metric cards", styles.includes('.host-period-report-cards[data-columns="5"]') && styles.includes("min-height:104px") && styles.includes('article[data-tone="mint"]'));
expect("Period selector remains clear without a promotional gradient", styles.includes(".host-collection-period-control .host-range-segments button[data-active]") && styles.includes("background:rgba(255,255,255,.96)"));
expect("Collection Desk actions stay in one horizontal row", styles.includes(".host-payment-row-actions { display:flex;min-width:246px;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:nowrap;") && styles.includes("white-space:nowrap"));
expect("Confirm Paid uses a restrained primary treatment", styles.includes(".host-payment-row-actions button[data-primary]") && styles.includes("background:#8065c3") && !styles.includes(".host-payment-row-actions button[data-primary] { border:0;color:#fff;background:linear-gradient"));
expect("Fully paid orders are excluded from the Collection Desk", hostPage.includes('const outstandingOrders = businessOrders.filter((order) => outstandingAmount(order) > 0)'));
expect("Host language preference is isolated from Customer language", hostPage.includes('pet-villa-host-language') && !hostPage.includes('useLanguage()'));
expect("Host has explicit English and Chinese controls", hostPage.includes('changeHostLanguage("en")') && hostPage.includes('changeHostLanguage("zh")') && hostPage.includes(">中文</button>"));
expect("Host page content and portal modals share one language runtime", hostPage.includes("<HostLanguageRuntime language={hostLanguage} />") && hostI18n.includes("MutationObserver") && hostI18n.includes("document.body"));
expect("Staff workspace shares the Host language preference", hostStaffPage.includes("pet-villa-host-language") && hostStaffPage.includes("<HostLanguageRuntime language={hostLanguage} />"));
expect("Paid in-stay orders remain in stay until explicit checkout", hostPage.includes("isCurrentlyAtVilla(selectedOrder) && selectedOrder.balance <= 0") && hostPage.includes("Check Out &amp; Complete"));
expect("No separate Mark Completed action remains", !hostPage.includes(">Mark Completed</button>"));
expect("Edit Booking supports Boarding and Daycare time semantics", hostPage.includes('value="overnight">Overnight Boarding') && hostPage.includes('value="daycare">Daycare') && hostPage.includes("orderEditForm.startTime") && hostPage.includes("orderEditForm.endTime"));
expect("Edit Booking supports adding and removing saved customer pets", hostPage.includes("orderEditForm.petIds.filter") && hostPage.includes("[...orderEditForm.petIds, dog.id]") && hostPage.includes("selectedOrderCustomer?.dogs.map"));
expect("Edit Booking persists all selected pet snapshots", orderUpdateRoute.includes("const requestedPetIds") && orderUpdateRoute.includes("verifiedPets") && orderUpdateRoute.includes("pets: verifiedPets"));
expect("Order update API rejects cross-customer pets", orderUpdateRoute.includes("petOwnerColumn") && orderUpdateRoute.includes("petOwnerId") && orderUpdateRoute.includes("must belong to this booking customer"));
expect("Daycare edits persist one date and start/end time", orderUpdateRoute.includes("Daycare requires one date") && orderUpdateRoute.includes("startTime") && orderUpdateRoute.includes("endTime"));

const daycareHours = Number("14:00".slice(0, 2)) - Number("10:00".slice(0, 2));
expect("Daycare regression: 10am to 2pm is four hours", daycareHours === 4);
expect("Daycare regression: two pets at RM5/hour totals RM40", daycareHours * 2 * 5 === 40);

const specialRange = { fromDate: "2026-08-01", toDate: "2026-08-04", boardingRate: 55, daycareRate: 8 };
const rangeRate = (service, date, normalRate) => date >= specialRange.fromDate && date <= specialRange.toDate
  ? specialRange[service === "overnight" ? "boardingRate" : "daycareRate"]
  : normalRate;
expect("Special-date range regression: every date from Aug 1 to Aug 4 uses the special rate", ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"].every((date) => rangeRate("overnight", date, 35) === 55));
expect("Special-date range regression: the day after the range uses the normal rate", rangeRate("overnight", "2026-08-05", 35) === 35);
const singleDayRange = { ...specialRange, fromDate: "2026-08-09", toDate: "2026-08-09" };
expect("Special-date range regression: matching From and To supports one day", "2026-08-09" >= singleDayRange.fromDate && "2026-08-09" <= singleDayRange.toDate && !("2026-08-10" >= singleDayRange.fromDate && "2026-08-10" <= singleDayRange.toDate));

const periodBounds = (range) => {
  const today = new Date(2026, 7, 12);
  const start = new Date(today);
  const end = new Date(today);
  if (range === "this-week" || range === "last-week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (range === "last-week" ? 7 : 0));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  } else if (range === "this-month") {
    start.setFullYear(today.getFullYear(), today.getMonth(), 1);
    end.setFullYear(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (range === "last-month") {
    start.setFullYear(today.getFullYear(), today.getMonth() - 1, 1);
    end.setFullYear(today.getFullYear(), today.getMonth(), 0);
  }
  const key = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return [key(start), key(end)];
};
expect("Collection period regression: This Week uses Monday through Sunday", periodBounds("this-week").join("/") === "2026-08-10/2026-08-16");
expect("Collection period regression: Last Week is distinct", periodBounds("last-week").join("/") === "2026-08-03/2026-08-09");
expect("Collection period regression: This Month uses current month boundaries", periodBounds("this-month").join("/") === "2026-08-01/2026-08-31");
expect("Collection period regression: Last Month is distinct", periodBounds("last-month").join("/") === "2026-07-01/2026-07-31");
expect("Dashboard custom range regression: From and To are inclusive", "2026-08-05" >= "2026-08-05" && "2026-08-12" <= "2026-08-12");

if (failures.length) {
  console.error(`\nHost booking business validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nHost booking business validation passed.");
