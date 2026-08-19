import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const migrationPath = "database/migrations/202608190001_stage_c1a_additive_foundation.sql";
const migration = fs.readFileSync(path.join(root, migrationPath), "utf8");

const checks = [];
function check(name, condition) {
  checks.push({ name, condition: Boolean(condition) });
}

const tableBlock = (table, nextMarker) => {
  const start = migration.indexOf(`create table public.${table}`);
  const end = migration.indexOf(nextMarker, start);
  return start >= 0 && end > start ? migration.slice(start, end) : "";
};

const paymentTable = tableBlock("payment_submissions", "create function public.protect_payment_submission_history");
const notificationTable = tableBlock("notification_events", "create function public.enforce_notification_event_correlation");
const consentTable = tableBlock("operational_whatsapp_consents", "create function public.enforce_online_booking_consent_owner");

check("Migration is atomic", migration.trimStart().startsWith("begin;") && migration.trimEnd().endsWith("commit;"));
check("Migration filename is Stage C1A additive foundation", path.basename(migrationPath) === "202608190001_stage_c1a_additive_foundation.sql");
check("Creates all three approved tables", ["payment_submissions", "notification_events", "operational_whatsapp_consents"].every((name) => migration.includes(`create table public.${name}`)));
check("Does not alter existing Production business tables", !/alter table public\.(orders|bookings|profiles|host_staff_members)\b/i.test(migration));
check("Does not write or backfill existing business rows", !/\b(update|delete from|insert into)\s+public\.(orders|bookings|profiles|host_staff_members)\b/i.test(migration));
check("Does not replace current payment functions", !/(create|replace|drop)[\s\S]{0,80}(submit_customer_order_payment|verify_host_order_payment)/i.test(migration));

check("Payment Order FK is RESTRICT", /order_row_id uuid not null references public\.orders\(id\) on delete restrict/.test(paymentTable));
check("Payment actor FKs use profiles", /submitted_by uuid not null references public\.profiles\(id\) on delete restrict/.test(paymentTable) && /resolved_by uuid references public\.profiles\(id\) on delete restrict/.test(paymentTable));
check("Payment amount constraints are present", ["amount_rm > 0", "paid_before_rm >= 0", "balance_before_rm > 0", "amount_rm <= balance_before_rm"].every((value) => paymentTable.includes(value)));
check("Payment method and status values are constrained", paymentTable.includes("method in ('qr', 'bank')") && paymentTable.includes("status in ('pending', 'verified', 'rejected')"));
check("Payment resolution states are consistent", /status = 'pending'[\s\S]*status = 'verified'[\s\S]*verified_amount_rm > 0[\s\S]*status = 'rejected'[\s\S]*verified_amount_rm is null[\s\S]*rejection_reason_code is not null/.test(paymentTable));
check("Submitter idempotency is unique", paymentTable.includes("unique (submitted_by, idempotency_key)"));
check("Only one pending submission per Order", /create unique index payment_submissions_one_pending_per_order_idx[\s\S]*\(order_row_id\)[\s\S]*where status = 'pending'/.test(migration));
check("Only approved payment indexes are defined", (paymentTable.match(/create (?:unique )?index/g) || []).length === 3);
check("Payment immutable fields are protected", ["new.order_row_id is distinct from old.order_row_id", "new.idempotency_key is distinct from old.idempotency_key", "new.amount_rm is distinct from old.amount_rm", "new.submitted_at is distinct from old.submitted_at"].every((value) => migration.includes(value)));
check("Resolved payment submissions are terminal", migration.includes("Resolved payment submissions are terminal."));
check("Payment DELETE is blocked", migration.includes("Payment submission history is immutable and cannot be deleted."));

const allowedEvents = [
  "FIRST_PAYMENT_SUBMITTED_PENDING_VERIFICATION",
  "LATER_BALANCE_PAYMENT_SUBMITTED_PENDING_VERIFICATION",
  "BOOKING_CONFIRMED",
  "PAYMENT_SUBMISSION_REJECTED",
  "ORDER_COMPLETED",
];
const eventTypeList = notificationTable.match(/event_type in \(([\s\S]*?)\n\s*\)/)?.[1] ?? "";
const constrainedEvents = [...eventTypeList.matchAll(/'([A-Z_]+)'/g)].map((match) => match[1]);
check(
  "Notification events use only approved types",
  constrainedEvents.length === allowedEvents.length
    && constrainedEvents.every((event) => allowedEvents.includes(event))
    && allowedEvents.every((event) => constrainedEvents.includes(event)),
);
check("Submission-related events require correlation", notificationTable.includes("event_type = 'ORDER_COMPLETED'") && notificationTable.includes("payment_submission_id is not null"));
check("Notification submission belongs to same Order", migration.includes("Notification payment submission must belong to the same order."));
check("Occurrence key is unique", /occurrence_key text not null unique/.test(notificationTable));
check("Notification indexes are minimum approved pair", (notificationTable.match(/create (?:unique )?index/g) || []).length === 2 && notificationTable.includes("(created_at, id)") && notificationTable.includes("(event_type, created_at)"));
check("Notification events are immutable", migration.includes("Notification events are immutable."));
check("No provider delivery fields were added", !/\b(meta|firebase|fcm|push|delivery_status|retry_policy)\b/i.test(notificationTable));

check("Consent Order and Owner FKs are RESTRICT", /order_row_id uuid not null references public\.orders\(id\) on delete restrict/.test(consentTable) && /owner_user_id uuid not null references public\.profiles\(id\) on delete restrict/.test(consentTable));
check("Consent source is online_booking only", consentTable.includes("source = 'online_booking'"));
check("Consent languages are en and zh only", consentTable.includes("language in ('en', 'zh')"));
check("Owner-approved EN consent wording is preserved", migration.includes("I agree to receive essential booking, payment and pet-care service updates from The Pet Villa via WhatsApp. No marketing messages will be sent."));
check("Owner-approved ZH consent wording is preserved", migration.includes("我同意通过 WhatsApp 接收 The Pet Villa 必要的预订、付款及宠物照护服务通知。我们不会发送营销信息。"));
check("At most one active consent per Order", /create unique index operational_whatsapp_consents_one_active_per_order_idx[\s\S]*\(order_row_id\)[\s\S]*where withdrawn_at is null/.test(migration));
check("Consent withdrawal cannot predate grant", consentTable.includes("withdrawn_at >= granted_at"));
check("Host-created Customer consent is excluded", migration.includes("and host_customer_id is null"));
check("Consent Owner must match online Order Owner", migration.includes("and owner_id = new.owner_user_id"));
check("Phone is documented as delivery address only", migration.includes("Consent-bound WhatsApp delivery address/contact information only."));
check("Consent history cannot be deleted or rewritten", migration.includes("Operational WhatsApp consent history cannot be deleted.") && migration.includes("Granted operational WhatsApp consent facts are immutable."));

for (const table of ["payment_submissions", "notification_events", "operational_whatsapp_consents"]) {
  check(`${table} has RLS enabled`, migration.includes(`alter table public.${table} enable row level security;`));
}
check("Browser table privileges are revoked", ["payment_submissions", "notification_events", "operational_whatsapp_consents"].every((table) => migration.includes(`revoke all on table public.${table} from public, anon, authenticated, service_role;`)));
check("Service role has no table DELETE grant", !/grant[^;]*delete[^;]*to service_role/i.test(migration));
check("No browser write grant exists", !/grant[^;]*(insert|update|delete)[^;]*to (public|anon|authenticated)/i.test(migration));
check("No browser RLS policies were added", !/create policy/i.test(migration));

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? "PASS" : "FAIL"} - ${item.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} C1A additive foundation static/security checks passed.`);
if (failed.length) process.exit(1);
