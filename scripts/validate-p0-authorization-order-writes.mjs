import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const migration = read("database/migrations/20260814193108_p0_authorization_order_write_protection.sql");
const authorizeHost = read("apps/web/app/api/host/_lib/authorizeHost.ts");
const middleware = read("apps/web/middleware.ts");
const orderFlow = read("apps/web/app/lib/orderFlow.ts");
const paymentRoute = read("apps/web/app/api/customer/orders/[orderId]/payment-submission/route.ts");
const cancelRoute = read("apps/web/app/api/customer/orders/[orderId]/cancel/route.ts");
const paymentPage = read("apps/web/app/payment/page.tsx");
const ordersPage = read("apps/web/app/orders/page.tsx");

const checks = [];
function check(name, condition) {
  checks.push({ name, condition: Boolean(condition) });
}

check("Host API has no profiles.role authorization fallback", !authorizeHost.includes('.from("profiles")') && !authorizeHost.includes("isHostRole"));
check("Host middleware has no profiles.role authorization fallback", !middleware.includes("select=role") && !middleware.includes("isHostRole"));
check("Host access requires an active staff row", authorizeHost.includes('staffMember.status !== "active"'));
check("Database Host identity uses host_staff_members", /current_user_is_host\(\)[\s\S]*from public\.host_staff_members[\s\S]*status = 'active'/.test(migration));
check("Database Host identity does not use profiles.role", !/current_user_is_host\(\)[\s\S]*from public\.profiles/.test(migration));
check("Customer profile role changes are trigger-protected", migration.includes("protect_profile_authorization_fields_trigger") && migration.includes("new.role is distinct from old.role"));
check("Customer order UPDATE policy is removed", migration.includes('drop policy if exists "orders_update_own_or_host"'));
check("Order UPDATE policy is active-staff-only", migration.includes('create policy "orders_update_active_staff"') && !/create policy "orders_update_active_staff"[\s\S]*auth\.uid\(\) = owner_id/.test(migration));
check("Direct non-service order UPDATE is blocked", migration.includes("Orders can only be updated through protected operations."));
check("Payment RPC requires service_role", /submit_customer_order_payment[\s\S]*auth\.role\(\)[\s\S]*service_role/.test(migration));
check("Payment RPC locks UUID plus owner", /where id = p_order_row_id[\s\S]*owner_id = p_owner_user_id[\s\S]*for update/.test(migration));
check("Payment RPC is idempotent", migration.includes("already_submitted") && migration.includes("? 'paymentSubmission'"));
check("Payment submission does not change paid_rm", !/submit_customer_order_payment[\s\S]*set paid_rm/.test(migration.split("create or replace function public.cancel_customer_order")[0]));
check("Cancellation RPC requires service_role", /cancel_customer_order[\s\S]*auth\.role\(\)[\s\S]*service_role/.test(migration));
check("Cancellation preserves financial columns", !/cancel_customer_order[\s\S]*set[\s\S]*(paid_rm|balance_rm|total_rm)/.test(migration.split("create or replace function public.verify_host_order_payment")[0].split("create or replace function public.cancel_customer_order")[1] || ""));
check("Protected RPCs are denied to browser roles", migration.includes("revoke all on function public.submit_customer_order_payment") && migration.includes("from public, anon, authenticated"));
check("Customer APIs validate bearer JWT", paymentRoute.includes("authorizeCustomerRequest") && cancelRoute.includes("authorizeCustomerRequest"));
check("Customer APIs use authenticated owner identity", paymentRoute.includes("authorization.user.id") && cancelRoute.includes("authorization.user.id"));
check("Customer order creation is insert-only", orderFlow.includes('.from("orders")\n    .insert(') && !orderFlow.includes('.from("orders")\n    .upsert('));
check("Customer payment page uses protected operation", paymentPage.includes("submitCustomerPayment") && !paymentPage.includes("updateOrder"));
check("Customer cancellation uses protected operation", ordersPage.includes("cancelCustomerOrder") && !ordersPage.includes("updateOrder"));
check("Customer review no longer updates orders", ordersPage.includes("saveCustomerOrderReview(updatedOrder)") && ordersPage.includes("writeOrders(nextOrders)"));
check("Host verification remains the paid/balance authority", migration.includes("create or replace function public.verify_host_order_payment") && migration.includes("set paid_rm = next_paid"));
check("Migration is atomic", migration.trimStart().startsWith("begin;") && migration.trimEnd().endsWith("commit;"));

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? "PASS" : "FAIL"} - ${item.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} P0 authorization and order-write checks passed.`);
if (failed.length) process.exit(1);
