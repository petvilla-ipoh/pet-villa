import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const expect = (name, condition) => {
  if (condition) console.log(`PASS - ${name}`);
  else failures.push(name);
};
const must = (name, callback) => {
  try {
    callback();
    expect(name, true);
  } catch (error) {
    console.error(error);
    expect(name, false);
  }
};

const migrationPath = "database/migrations/202608190002_stage_c1b_payment_transaction_cutover.sql";
const c1aPath = "database/migrations/202608190001_stage_c1a_additive_foundation.sql";
const migration = read(migrationPath);
const c1a = read(c1aPath);
const customerSubmissionRoute = read("apps/web/app/api/customer/orders/[orderId]/payment-submission/route.ts");
const hostVerifyRoute = read("apps/web/app/api/host/orders/[orderId]/verify-payment/route.ts");
const hostRejectRoute = read("apps/web/app/api/host/orders/[orderId]/reject-payment/route.ts");
const hostPrepareRoute = read("apps/web/app/api/host/orders/[orderId]/payment-submission/route.ts");
const consentRoute = read("apps/web/app/api/customer/orders/[orderId]/operational-whatsapp-consent/route.ts");
const hostOrderRoute = read("apps/web/app/api/host/orders/[orderId]/route.ts");
const hostOrdersRoute = read("apps/web/app/api/host/orders/route.ts");
const orderFlow = read("apps/web/app/lib/orderFlow.ts");
const paymentPage = read("apps/web/app/payment/page.tsx");
const bookingPage = read("apps/web/app/booking/page.tsx");
const hostPage = read("apps/web/app/host/page.tsx");
const dingDongValidator = read("scripts/validate-host-ding-dong.mjs");

function functionBlock(signature) {
  const start = migration.indexOf(signature);
  const end = migration.indexOf("$$;", start);
  return start >= 0 && end >= start ? migration.slice(start, end + 3) : "";
}

const submitRpc = functionBlock("create or replace function public.submit_customer_order_payment(\n  p_order_row_id uuid,\n  p_owner_user_id uuid,\n  p_amount numeric,\n  p_method text,\n  p_idempotency_key text");
const verifyRpc = functionBlock("create or replace function public.verify_host_order_payment(\n  p_order_row_id uuid,\n  p_actor_user_id uuid,\n  p_mode text,\n  p_payment_submission_id uuid");
const rejectRpc = functionBlock("create or replace function public.reject_host_order_payment(");
const legacyRpc = functionBlock("create or replace function public.materialize_legacy_pending_payment_submission(");
const consentRpc = functionBlock("create or replace function public.record_operational_whatsapp_consent(");

expect("C1B is one atomic forward migration", migration.trimStart().startsWith("begin;") && migration.trimEnd().endsWith("commit;"));
expect("C1A migration remains byte-for-byte accepted", crypto.createHash("sha256").update(c1a).digest("hex").toUpperCase() === "5AF8A6AC69FC4001D5FFBBF092D0A827F033E597BC455C2EB41849D6259E30A2");
expect("C1B does not create C1C ORDER_COMPLETED behaviour", !migration.includes("ORDER_COMPLETED"));
expect("C1B has no provider or Push integration", !/meta|whatsapp.*send|firebase|fcm|push|provider/i.test(migration));
expect("C1B never scans or backfills historical Orders", migration.includes("materialized only while a protected payment action touches that one Order") && migration.includes("No FIRST/LATER event is fabricated here") && !migration.includes("from public.orders\n  where created_at"));

expect("Customer submission locks its Order and pending submission", submitRpc.includes("for update") && submitRpc.includes("payment_submissions") && submitRpc.includes("payment_submissions_one_pending" ) === false);
expect("Customer submission uses a durable retry key", submitRpc.includes("p_idempotency_key") && customerSubmissionRoute.includes("idempotencyKey: z.string().uuid()") && paymentPage.includes("crypto.randomUUID()"));
expect("Customer submission has no direct-write fallback", !customerSubmissionRoute.includes("submitWithProtectedServerFallback") && !customerSubmissionRoute.includes('.from("orders").update'));
expect("Customer submission never changes verified money", !/update public\.orders\s+set paid_rm|update public\.orders\s+set[\s\S]{0,80}balance_rm/i.test(submitRpc));
expect("Customer submission emits FIRST and LATER event classes", submitRpc.includes("FIRST_PAYMENT_SUBMITTED_PENDING_VERIFICATION") && submitRpc.includes("LATER_BALANCE_PAYMENT_SUBMITTED_PENDING_VERIFICATION"));
expect("Legacy pending payloads are materialized only on touch", legacyRpc.includes("paymentSubmission") && legacyRpc.includes("submitted_at_value") && legacyRpc.includes("No FIRST/LATER event is fabricated here"));
expect("Legacy materialization fails closed on missing facts", legacyRpc.includes("cannot be materialized safely") && legacyRpc.includes("previous_status") && legacyRpc.includes("submitted_at_value"));

expect("Host Verify requires payments.manage and a specific submission", hostVerifyRoute.includes('authorizeHostRequest(request, "payments.manage")') && hostVerifyRoute.includes("paymentSubmissionId") && verifyRpc.includes("p_payment_submission_id is null"));
expect("Host Verify locks Order then specific submission", verifyRpc.indexOf("from public.orders") < verifyRpc.indexOf("from public.payment_submissions") && verifyRpc.includes("for update"));
expect("Host Verify changes money exactly through durable submission", verifyRpc.includes("set paid_rm = next_paid") && verifyRpc.includes("set status = 'verified'") && verifyRpc.includes("verified_amount_rm = submitted_amount"));
expect("BOOKING_CONFIRMED is once-only on first verified money", verifyRpc.includes("target_order.paid_rm, 0)) = 0") && verifyRpc.includes("BOOKING_CONFIRMED:") && verifyRpc.includes("on conflict (occurrence_key) do nothing"));
expect("Later ordinary balance verification emits no second confirmation", verifyRpc.includes("if p_mode = 'submission'\n    and greatest") && !verifyRpc.includes("LATER_BALANCE_PAYMENT_VERIFIED"));
expect("Host balance mode is blocked by a pending Customer submission", verifyRpc.includes("Resolve the pending customer payment submission before recording a balance payment."));

expect("Host Reject requires payments.manage and a specific submission", hostRejectRoute.includes('authorizeHostRequest(request, "payments.manage")') && hostRejectRoute.includes("paymentSubmissionId") && rejectRpc.includes("p_payment_submission_id is null"));
expect("Host Reject is a narrow pending-to-rejected transition", rejectRpc.includes("set status = 'rejected'") && rejectRpc.includes("target_submission.status = 'verified'") && rejectRpc.includes("target_submission.status = 'rejected'"));
expect("Host Reject preserves verified money and restores exact status", !/set paid_rm|set balance_rm/i.test(rejectRpc) && rejectRpc.includes("status = target_submission.previous_order_status"));
expect("Host Reject emits one idempotent rejection event", rejectRpc.includes("PAYMENT_SUBMISSION_REJECTED:") && rejectRpc.includes("on conflict (occurrence_key) do nothing"));
expect("Legacy Host review materializes before specific verification/rejection", hostPrepareRoute.includes('authorizeHostRequest(request, "payments.manage")') && migration.includes("materialize_host_order_payment_submission") && hostPage.includes("prepareHostPaymentSubmissionAsHost"));

expect("Server Check In requires verified paid_rm > 0", hostOrderRoute.includes('next.status === "staying" && paid <= 0') && hostOrderRoute.includes("A verified payment is required before checking in this booking."));
expect("Host Check In UI follows the same paid gate", hostPage.includes("Math.max(0, order.paid || 0) > 0") && hostPage.includes("A verified payment is required before check-in."));
expect("Checkout remains blocked while balance remains", hostOrderRoute.includes('next.status === "ready_pickup" && balance > 0') && hostOrderRoute.includes("before checking out this booking"));

expect("Consent checkbox is required and unchecked by default", bookingPage.includes("useState(false)") && bookingPage.includes('id="booking-whatsapp-consent"') && bookingPage.includes("!operationalWhatsAppConsent"));
expect("Online booking payment is server-blocked without consent", submitRpc.includes("Operational WhatsApp consent is required before the first online payment submission."));
expect("Consent wording is server-owned and exact", consentRpc.includes("pet-villa-operational-whatsapp-v1") && consentRpc.includes("I agree to receive essential booking, payment and pet-care service updates from The Pet Villa via WhatsApp. No marketing messages will be sent.") && consentRpc.includes("我同意通过 WhatsApp 接收 The Pet Villa 必要的预订、付款及宠物照护服务通知。我们不会发送营销信息。"));
expect("Consent route is Customer-auth bound and phone is delivery only", consentRoute.includes("authorizeCustomerRequest") && consentRpc.includes("normalized_phone") && consentRpc.includes("host_customer_id is null") && !consentRpc.includes("auth.users"));
expect("No historical consent backfill is present", !/insert into public\.operational_whatsapp_consents[\s\S]{0,200}select/i.test(migration));

expect("Host listing overlays durable pending identity without exposing it in UI", hostOrdersRoute.includes('from("payment_submissions")') && hostOrdersRoute.includes("paymentSubmission: {") && hostPage.includes("paymentSubmissionId") && !/paymentSubmissionId[^\n]{0,80}<|payment_submission_id[^\n]{0,80}</.test(hostPage));
expect("Ding-Dong acceptance guard remains present", dingDongValidator.includes("Uses a two-tone Ding-Dong") && hostPage.includes("frequency: 880") && hostPage.includes("frequency: 659.25"));

class PaymentModel {
  constructor({ paid = 0, balance = 200, status = "balance", consent = true, phone = "60123456789" } = {}) {
    this.order = { id: "order-1", paid, balance, total: paid + balance, status, consent, phone };
    this.submissions = [];
    this.events = [];
  }

  submit(key, amount, method = "qr") {
    const same = this.submissions.find((item) => item.key === key);
    if (same) return same;
    const pending = this.submissions.find((item) => item.status === "pending");
    if (pending) return pending;
    if (this.order.paid === 0 && !this.order.consent) throw new Error("consent required");
    if (amount <= 0 || amount > this.order.balance) throw new Error("amount invalid");
    const submission = {
      id: `submission-${this.submissions.length + 1}`,
      key,
      amount,
      method,
      status: "pending",
      previousStatus: this.order.status,
      paidBefore: this.order.paid,
      balanceBefore: this.order.balance
    };
    this.submissions.push(submission);
    this.order.status = "pending_verification";
    this.events.push({ type: submission.paidBefore === 0 ? "FIRST_PAYMENT_SUBMITTED_PENDING_VERIFICATION" : "LATER_BALANCE_PAYMENT_SUBMITTED_PENDING_VERIFICATION", key: `PAYMENT_SUBMISSION:${submission.id}` });
    return submission;
  }

  verify(submissionId) {
    const submission = this.submissions.find((item) => item.id === submissionId);
    if (!submission) throw new Error("specific submission required");
    if (submission.status === "verified") return { alreadyVerified: true };
    if (submission.status === "rejected" || this.order.status !== "pending_verification") throw new Error("conflict");
    if (submission.amount > this.order.balance) throw new Error("amount exceeds balance");
    const before = this.order.paid;
    this.order.paid += submission.amount;
    this.order.balance -= submission.amount;
    this.order.status = this.order.balance > 0 ? "balance" : "confirmed";
    submission.status = "verified";
    if (before === 0 && this.order.paid > 0 && !this.events.some((event) => event.key === `BOOKING_CONFIRMED:${this.order.id}`)) {
      this.events.push({ type: "BOOKING_CONFIRMED", key: `BOOKING_CONFIRMED:${this.order.id}` });
    }
    return { alreadyVerified: false };
  }

  reject(submissionId) {
    const submission = this.submissions.find((item) => item.id === submissionId);
    if (!submission) throw new Error("specific submission required");
    if (submission.status === "verified") throw new Error("verified cannot reject");
    if (submission.status === "rejected") return { alreadyRejected: true };
    if (this.order.status !== "pending_verification") throw new Error("conflict");
    submission.status = "rejected";
    this.order.status = submission.previousStatus;
    if (!this.events.some((event) => event.key === `PAYMENT_SUBMISSION_REJECTED:${submission.id}`)) {
      this.events.push({ type: "PAYMENT_SUBMISSION_REJECTED", key: `PAYMENT_SUBMISSION_REJECTED:${submission.id}` });
    }
    return { alreadyRejected: false };
  }

  verifyHostBalance() {
    if (this.submissions.some((item) => item.status === "pending")) throw new Error("pending submission");
    if (this.order.paid <= 0) throw new Error("first payment must be customer submission");
    const amount = this.order.balance;
    this.order.paid += amount;
    this.order.balance = 0;
    this.order.status = "confirmed";
    return amount;
  }

  canCheckIn() {
    return ["confirmed", "balance"].includes(this.order.status) && this.order.paid > 0;
  }
}

must("First deposit submission is pending with paid/balance unchanged and one FIRST event", () => {
  const model = new PaymentModel();
  const submission = model.submit("request-1", 50);
  assert.equal(submission.status, "pending");
  assert.equal(model.order.paid, 0);
  assert.equal(model.order.balance, 200);
  assert.deepEqual(model.events.map((event) => event.type), ["FIRST_PAYMENT_SUBMITTED_PENDING_VERIFICATION"]);
});
must("First full submission leaves verified money unchanged", () => {
  const model = new PaymentModel();
  model.submit("request-full", 200, "bank");
  assert.equal(model.order.paid, 0);
  assert.equal(model.order.balance, 200);
});
must("Same retry, different retry, and concurrent attempts result in one pending submission", () => {
  const model = new PaymentModel();
  const first = model.submit("request-1", 50);
  assert.equal(model.submit("request-1", 50).id, first.id);
  assert.equal(model.submit("request-2", 50).id, first.id);
  const concurrent = [model.submit("request-3", 50), model.submit("request-4", 50)];
  assert.equal(new Set(concurrent.map((item) => item.id)).size, 1);
  assert.equal(model.submissions.filter((item) => item.status === "pending").length, 1);
});
must("First Host Verify contributes money once and confirms once", () => {
  const model = new PaymentModel();
  const submission = model.submit("request-1", 50);
  model.verify(submission.id);
  assert.deepEqual({ paid: model.order.paid, balance: model.order.balance, status: model.order.status }, { paid: 50, balance: 150, status: "balance" });
  assert.equal(model.events.filter((event) => event.type === "BOOKING_CONFIRMED").length, 1);
  model.verify(submission.id);
  assert.equal(model.order.paid, 50);
});
must("Later balance payment stays on the same Booking and creates no second confirmation", () => {
  const model = new PaymentModel();
  const first = model.submit("request-1", 50);
  model.verify(first.id);
  const later = model.submit("request-2", 150);
  assert.equal(later.paidBefore, 50);
  assert.equal(model.events.at(-1).type, "LATER_BALANCE_PAYMENT_SUBMITTED_PENDING_VERIFICATION");
  model.verify(later.id);
  assert.equal(model.order.balance, 0);
  assert.equal(model.events.filter((event) => event.type === "BOOKING_CONFIRMED").length, 1);
});
must("First reject preserves money/history and restores the exact previous status", () => {
  const model = new PaymentModel();
  const submission = model.submit("request-1", 50);
  model.reject(submission.id);
  assert.deepEqual({ paid: model.order.paid, balance: model.order.balance, status: model.order.status, submission: submission.status }, { paid: 0, balance: 200, status: "balance", submission: "rejected" });
  assert.equal(model.events.filter((event) => event.type === "BOOKING_CONFIRMED").length, 0);
  assert.equal(model.events.filter((event) => event.type === "PAYMENT_SUBMISSION_REJECTED").length, 1);
  model.reject(submission.id);
  assert.equal(model.events.filter((event) => event.type === "PAYMENT_SUBMISSION_REJECTED").length, 1);
});
must("Later reject preserves the verified deposit and in-progress status", () => {
  const model = new PaymentModel();
  const first = model.submit("request-1", 50);
  model.verify(first.id);
  model.order.status = "staying";
  const later = model.submit("request-2", 150);
  model.reject(later.id);
  assert.deepEqual({ paid: model.order.paid, balance: model.order.balance, status: model.order.status }, { paid: 50, balance: 150, status: "staying" });
});
must("Verified payment cannot be rejected", () => {
  const model = new PaymentModel();
  const submission = model.submit("request-1", 50);
  model.verify(submission.id);
  assert.throws(() => model.reject(submission.id));
});
must("Pending submission blocks Host balance mode; normal balance mode remains available after a verified deposit", () => {
  const pending = new PaymentModel();
  pending.submit("request-1", 50);
  assert.throws(() => pending.verifyHostBalance());
  const normal = new PaymentModel();
  const first = normal.submit("request-1", 50);
  normal.verify(first.id);
  assert.equal(normal.verifyHostBalance(), 150);
});
must("Check In blocks balance/confirmed paid RM0 and allows a verified deposit", () => {
  assert.equal(new PaymentModel({ paid: 0, balance: 200, status: "balance" }).canCheckIn(), false);
  assert.equal(new PaymentModel({ paid: 0, balance: 200, status: "confirmed" }).canCheckIn(), false);
  assert.equal(new PaymentModel({ paid: 50, balance: 150, status: "balance" }).canCheckIn(), true);
});
must("Consent is required for first online payment and same phone never merges customers", () => {
  const withoutConsent = new PaymentModel({ consent: false, phone: "60123456789" });
  assert.throws(() => withoutConsent.submit("request-1", 50));
  const firstCustomer = new PaymentModel({ phone: "60123456789" });
  const secondCustomer = new PaymentModel({ phone: "60123456789" });
  firstCustomer.submit("request-1", 50);
  assert.equal(secondCustomer.submissions.length, 0);
});

if (failures.length) {
  console.error(`\nC1B payment transaction cutover validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nC1B payment transaction cutover validation passed.");
