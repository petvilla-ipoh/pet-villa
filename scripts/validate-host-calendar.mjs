import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const route = read("apps/web/app/api/host/calendar/route.ts");
const availability = read("apps/web/app/lib/hostAvailability.ts");
const hostPage = read("apps/web/app/host/page.tsx");
const bookingPage = read("apps/web/app/booking/page.tsx");
const capacity = read("apps/web/app/lib/bookingCapacity.ts");
const failures = [];

function expect(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(name);
}

expect("Calendar write API requires calendar.manage", route.includes('authorizeHostRequest(request, "calendar.manage")'));
expect("Calendar writes use authorized server client", route.includes('authorization.admin.from("host_off_days")'));
expect("Mark Full is idempotent by business date", route.includes("upsert(") && route.includes('onConflict: "day"'));
expect("Reopen deletes only the selected business date", route.includes('.delete().eq("day", day)'));
expect("Calendar browser sends the Host bearer token", availability.includes('fetch("/api/host/calendar"') && availability.includes('Authorization: `Bearer ${accessToken}`'));
expect("Failed writes do not update local UI state", availability.indexOf("if (!response.ok)") < availability.indexOf("window.localStorage.setItem"));
expect("Host asks for explicit Full/Reopen confirmation", hostPage.includes("Customers will no longer be able to select this date") && hostPage.includes("Customers will be able to select this date again"));
expect("Customer booking reads the shared Host off-day source", bookingPage.includes("loadHostOffDays") && bookingPage.includes("isHostOffDay"));
expect("Business date conversion uses Kuala Lumpur timezone", capacity.includes('timeZone: "Asia/Kuala_Lumpur"'));

if (failures.length) {
  console.error(`\nHost Calendar validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nHost Calendar validation passed.");
