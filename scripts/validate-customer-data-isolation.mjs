import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const check = (name, condition) => checks.push([name, Boolean(condition)]);

const authorize = read("apps/web/app/api/customer/_lib/authorizeCustomer.ts");
const ordersRoute = read("apps/web/app/api/customer/orders/route.ts");
const petsRoute = read("apps/web/app/api/customer/pets/route.ts");
const diaryRoute = read("apps/web/app/api/customer/diary/route.ts");
const messagesRoute = read("apps/web/app/api/customer/messages/route.ts");
const bookingDraftRoute = read("apps/web/app/api/customer/booking-draft/route.ts");
const orderFlow = read("apps/web/app/lib/orderFlow.ts");
const pets = read("apps/web/app/lib/petProfiles.ts");
const diary = read("apps/web/app/lib/diaryUpdates.ts");
const messages = read("apps/web/app/lib/messages.ts");
const chatPage = read("apps/web/app/chat/page.tsx");
const reviews = read("apps/web/app/lib/reviews.ts");

check("Customer authorization validates bearer JWT", authorize.includes("admin.auth.getUser(token)"));
check("Unauthenticated customer API is rejected", authorize.includes("status: 401"));

for (const [name, source, table] of [
  ["Orders", ordersRoute, "orders"],
  ["Pets", petsRoute, "pets"],
  ["Diary", diaryRoute, "pet_diary_updates"],
  ["Messages", messagesRoute, "chat_messages"]
]) {
  check(`${name} route authorizes the JWT`, source.includes("authorizeCustomerRequest(request)"));
  check(`${name} route reads ${table}`, source.includes(`.from(\"${table}\")`));
  check(`${name} route forces authenticated owner scope`, source.includes('.eq("owner_id", authorization.user.id)') || source.includes('.eq("owner_id", user.id)'));
  check(`${name} route does not grant Host-wide scope`, !source.includes("current_user_is_host") && !source.includes("authorizeHost"));
  check(`${name} query failure returns an error`, source.includes("{ status: 500 }") && source.includes("console.error"));
}

check("Booking draft route authorizes the JWT", bookingDraftRoute.includes("authorizeCustomerRequest(request)"));
check("Booking draft route forces authenticated owner scope", bookingDraftRoute.includes('.eq("owner_id", authorization.user.id)'));
check("Booking draft route does not grant Host-wide scope", !bookingDraftRoute.includes("authorizeHost") && !bookingDraftRoute.includes("current_user_is_host"));
check("Customer Booking uses protected draft read", orderFlow.includes('fetchAuthenticatedCustomerJson<{ booking: BookingRow | null }>("/api/customer/booking-draft")'));

check("Customer Orders uses protected server read", orderFlow.includes('fetchAuthenticatedCustomerJson<CustomerOrdersResponse>("/api/customer/orders")'));
check("Customer Pets uses protected server read", pets.includes('fetchAuthenticatedCustomerJson<{ pets: PetRow[] }>("/api/customer/pets")'));
check("Customer Diary uses protected server read", diary.includes('fetchAuthenticatedCustomerJson<{ entries: DiaryRow[] }>("/api/customer/diary")'));
check("Customer Chat uses protected server read", messages.includes('fetchAuthenticatedCustomerJson<{ messages: ChatMessageRow[] }>("/api/customer/messages")'));
check("Customer Chat page cannot call Host-wide message loader", chatPage.includes("loadCustomerMessages") && !chatPage.includes("loadMessages("));
check("Host Orders business-wide path remains", orderFlow.includes('fetch("/api/host/orders"'));
check("Customer Payments and history inherit scoped Orders", orderFlow.includes("export async function loadOrders()"));
check("Customer order errors are not converted to empty", /catch \(error\)[\s\S]*throw new Error\("Your orders could not be loaded/.test(orderFlow));
check("Customer diary errors are not converted to empty", diary.includes('throw new Error("Your Private Diary could not be refreshed.")'));
check("Public Customer reviews exclude hidden rows in the query", reviews.includes('if (!includeHidden) query = query.eq("hidden", false)'));
check("Legacy unscoped order cache is not read", orderFlow.includes("pet-villa-owner-scoped-orders-v2") && !orderFlow.includes("return `pet-villa-orders:${userId}`"));
check("Legacy unscoped pet cache is not read", pets.includes("pet-villa-owner-scoped-pets-v2") && !pets.includes("return `pet-villa-pets:${userId}`"));

let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures += 1;
}
console.log(`\n${checks.length - failures}/${checks.length} customer isolation checks passed.`);
if (failures) process.exit(1);
