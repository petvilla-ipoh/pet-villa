import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const accountingSource = read("apps/web/app/lib/businessAccounting.ts")
  .replace('import { isBusinessOrder } from "./safeVoid";', "const isBusinessOrder = (order) => !Boolean(order.voidedAt);")
  .replace('import type { BusinessExpense } from "./hostOperations";', "");
const compiledAccounting = ts.transpileModule(accountingSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const accounting = await import(`data:text/javascript;base64,${Buffer.from(compiledAccounting).toString("base64")}`);

const expenses = [
  { id: "expense-1", expenseDate: "2026-08-09", amount: 82.35, category: "supplies", note: "Care supplies", createdAt: "2026-08-09T04:00:00Z" },
  { id: "expense-2", expenseDate: "2026-08-10", amount: 30.5, category: "utilities", note: "Utilities", createdAt: "2026-08-10T04:00:00Z" }
];
const expenseMetrics = accounting.calculateExpenseMetrics(expenses, 450, 110, "2026-08-10", "2026-08-10");
assert.deepEqual(expenseMetrics, {
  overallExpenses: 112.85,
  cashOnHand: 337.15,
  periodExpenses: 30.5,
  periodNetCash: 79.5
});
assert.equal(accounting.expensesInDateRange(expenses, "2026-08-10", "2026-08-10").length, 1, "Expense date filtering must be inclusive.");

const migration = read("database/migrations/20260812161254_host_order_charges_and_expenses.sql");
assert.match(migration, /add column if not exists charge_total_rm numeric\(10, 2\) not null default 0/i, "Existing orders must receive a zero charge default without fabricated history.");
assert.match(migration, /request_id uuid not null unique/i, "Requests need a durable idempotency key.");
assert.match(migration, /next_total := coalesce\(target_order\.total_rm, 0\) \+ created_charge\.amount_rm/i);
assert.match(migration, /next_balance := greatest\(0, next_total - coalesce\(target_order\.paid_rm, 0\)\)/i);
assert.doesNotMatch(migration, /set\s+paid_rm\s*=/i, "Add Charge must never change verified paid amount.");
assert.match(migration, /where request_id = p_request_id/i, "Duplicate requests must return their existing permanent record.");
assert.match(migration, /on conflict \(request_id\) do nothing/i, "Concurrent expense retries must remain idempotent.");
assert.match(migration, /order\.charge_added/i);
assert.match(migration, /expense\.recorded/i);
assert.match(migration, /revoke all on table public\.order_charges from public, anon, authenticated/i);
assert.match(migration, /revoke all on table public\.business_expenses from public, anon, authenticated/i);
assert.match(migration, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/i, "Financial RPCs must fail closed outside the protected Host server path.");
assert.doesNotMatch(migration, /update public\.orders[\s\S]{0,200}where charge_total_rm/i, "Migration must not rewrite historical order amounts.");

const chargeRoute = read("apps/web/app/api/host/orders/[orderId]/charges/route.ts");
const expenseRoute = read("apps/web/app/api/host/expenses/route.ts");
assert.match(chargeRoute, /authorizeHostRequest\(request, "payments\.manage"\)/);
assert.match(expenseRoute, /authorizeHostRequest\(request, "payments\.view"\)/);
assert.match(expenseRoute, /authorizeHostRequest\(request, "payments\.manage"\)/);
assert.match(expenseRoute, /two decimal places/i, "Expense API must reject precision beyond sen.");
assert.match(chargeRoute, /reasonCode: z\.literal\("late_checkout"\)/);

const hostPage = read("apps/web/app/host/page.tsx");
assert.match(hostPage, /Add Charge/);
assert.match(hostPage, /Record Expense/);
assert.match(hostPage, /Cash On Hand/);
assert.match(hostPage, /Operational cash view, not a bank balance/);
assert.match(hostPage, /Paid amount stays unchanged/);
assert.match(hostPage, /Once recorded, this expense cannot be edited or deleted/);
assert.match(hostPage, /function expenseMoney[\s\S]*toFixed\(2\)/, "Expense display must retain two decimal places.");
assert.match(hostPage, /expenses\.slice\(0, 5\)/, "Recent expenses must remain compact by default.");
assert.match(hostPage, /collectionOrders\.slice\(0, 10\)/, "Order collections must remain compact by default.");
assert.match(hostPage, /View all \$\{expenses\.length\} records/);
assert.match(hostPage, /View all \$\{collectionOrders\.length\} records/);

console.log("Host finance validation passed: 16 checks.");
