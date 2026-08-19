import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const publicRoute = read("apps/web/app/api/public/availability/route.ts");
const hostRoute = read("apps/web/app/api/host/calendar/route.ts");
const availability = read("apps/web/app/lib/hostAvailability.ts");
const home = read("apps/web/app/page.tsx");
const booking = read("apps/web/app/booking/page.tsx");
const failures = [];

function expect(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(name);
}

expect(
  "Public availability GET reads only blocked business dates",
  publicRoute.includes('export async function GET()')
    && publicRoute.includes('.from("host_off_days")')
    && publicRoute.includes('.select("day")')
    && publicRoute.includes('{ fullDates }')
);
expect(
  "Public response does not expose Host authorization or write fields",
  !publicRoute.includes("authorizeHostRequest")
    && !publicRoute.includes("created_by")
    && !publicRoute.includes(".insert(")
    && !publicRoute.includes(".update(")
    && !publicRoute.includes(".delete(")
    && !publicRoute.includes(".upsert(")
);
expect(
  "Public availability bypasses customer-session hydration safely on the server",
  availability.includes('fetch("/api/public/availability"')
    && !availability.includes('.from("host_off_days").select')
);
expect(
  "Production availability never falls back to localStorage",
  availability.includes('process.env.NODE_ENV !== "production"')
    && availability.includes("if (!allowDevelopmentFallback")
    && availability.includes("throw new Error(\"Booking availability could not be refreshed.\")")
);
expect(
  "Home and Booking use the same availability loader",
  home.includes("loadHostOffDays") && booking.includes("loadHostOffDays")
);
expect(
  "Home does not label unknown availability as Available",
  home.includes('availabilityStatus === "error"')
    && home.includes('href={availabilityKnown ?')
    && home.includes('en: "Unavailable"')
);
expect(
  "Booking disables dates until authoritative availability is known",
  booking.includes("const disabled = !availabilityKnown || past || off")
    && booking.includes("if (!availabilityKnown || date < today")
    && booking.includes("availabilityKnown && !offDayIssue")
);
expect(
  "First Booking date selection replaces the untouched Today range",
  booking.includes('if (!dateTouched) {')
    && booking.includes('setStartDate(date);\n      setEndDate(date);\n      return;')
);
expect(
  "Availability errors provide retry without fake success",
  home.includes('en: "Retry"')
    && booking.includes('en: "Retry"')
    && booking.includes('availabilityStatus === "error"')
);
expect(
  "Host Calendar writes remain permission protected and idempotent",
  hostRoute.includes('authorizeHostRequest(request, "calendar.manage")')
    && hostRoute.includes('onConflict: "day"')
);
expect(
  "Home date-dependent availability waits until client hydration",
  home.includes("const [today, setToday] = useState<Date | null>(null)")
    && home.includes("setToday(startOfLocalDay(new Date()))")
    && home.includes("availability-placeholder-")
);

if (failures.length) {
  console.error(`\nPublic availability validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nPublic availability validation passed.");
