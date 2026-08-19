import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(name);
}

const route = read("apps/web/app/api/host/orders/route.ts");
const orderFlow = read("apps/web/app/lib/orderFlow.ts");
const hostLoader = orderFlow.slice(orderFlow.indexOf("export async function loadAllOrdersForHost"));

expect("Host orders API requires bookings.view", route.includes('authorizeHostRequest(request, "bookings.view")'));
expect("Host orders API queries with the authorized server client", route.includes('authorization.admin') && route.includes('.from("orders")'));
expect("Host orders API logs database diagnostics only on the server", route.includes('console.error("[host/orders] orders query failed"') && route.includes("error.details") && route.includes("error.hint"));
expect("Host orders API returns a generic browser error", route.includes('Host orders could not be loaded.') && !route.includes("NextResponse.json({ error: error.message"));
expect("Host loader calls the protected orders API", hostLoader.includes('fetch("/api/host/orders"'));
expect("Host loader sends the current bearer token", hostLoader.includes('Authorization: `Bearer ${accessToken}`'));
expect("Host loader bypasses browser orders RLS", !hostLoader.includes("listSupabaseOrders(context.supabase)"));
expect("Host loader preserves authorization failures", hostLoader.includes("status: response.status"));

if (failures.length) {
  console.error(`\nHost orders validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nHost orders validation passed.");
