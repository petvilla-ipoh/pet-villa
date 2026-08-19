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

const home = read("apps/web/app/page.tsx");
const booking = read("apps/web/app/booking/page.tsx");
const businessSettings = read("apps/web/app/lib/businessSettings.ts");
const pricingSource = read("apps/web/app/lib/pricing.ts");
const hostBookingsRoute = read("apps/web/app/api/host/bookings/route.ts");
const compiledPricing = ts.transpileModule(pricingSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const pricing = await import(`data:text/javascript;base64,${Buffer.from(compiledPricing).toString("base64")}`);

expect(
  "Home starts without a business-price default",
  home.includes("useState<BusinessSettings | null>(null)")
    && !home.includes("DEFAULT_BUSINESS_SETTINGS")
    && !home.includes("RM35 / night")
);
expect(
  "Home renders explicit loading and unavailable pricing states",
  home.includes('setPricingStatus("ready")')
    && home.includes('setPricingStatus("error")')
    && home.includes('en: "Loading price..."')
    && home.includes('en: "Price unavailable"')
);
expect(
  "Missing or invalid authoritative rate data fails instead of falling back to RM35 or RM5",
  businessSettings.includes("function authoritativeRate")
    && businessSettings.includes('authoritativeRate(row.boarding_rate_rm, "boarding")')
    && businessSettings.includes('authoritativeRate(row.daycare_rate_rm, "daycare")')
    && !businessSettings.includes("boarding_rate_rm ?? DEFAULT_BUSINESS_SETTINGS.boardingRate")
    && !businessSettings.includes("daycare_rate_rm ?? DEFAULT_BUSINESS_SETTINGS.daycareRate")
);
expect(
  "Booking starts without a price default or numeric fallback",
  booking.includes("useState<BusinessSettings | null>(null)")
    && !booking.includes("DEFAULT_BUSINESS_SETTINGS")
    && !booking.includes("|| 35")
    && !booking.includes("|| 5")
);
expect(
  "Booking does not calculate or save a draft before authoritative pricing is ready",
  booking.includes("const subtotal = pricingReady && selectedPets.length > 0")
    && booking.includes("petCompleted && pricingReady && total > 0")
    && booking.includes("if (!pricingReady) {")
    && booking.includes("setBookingDataMessage(pricingNotice)")
);
expect(
  "Booking shows loading or unavailable text instead of RM0 before pricing is ready",
  booking.includes("const pricingAmount = (amount: number) => pricingReady ? `RM${amount}` : pricingMessage")
    && booking.includes("{pricingAmount(total)}")
    && booking.includes("{pricingAmount(balance)}")
    && booking.includes("{pricingAmount(deposit)}")
);

const regularPricing = { boardingRate: 40, daycareRate: 5 };
expect(
  "Authoritative normal rates remain RM40 boarding and RM5 daycare",
  pricing.rateForDate("overnight", "2026-08-17", regularPricing) === 40
    && pricing.rateForDate("daycare", "2026-08-17", regularPricing) === 5
);
expect(
  "Special-date pricing remains inclusive and authoritative",
  pricing.rateForDate("overnight", "2026-08-09", {
    ...regularPricing,
    specialDateRates: [{ fromDate: "2026-08-09", toDate: "2026-08-09", boardingRate: 55 }]
  }) === 55
    && pricing.rateForDate("overnight", "2026-08-10", {
      ...regularPricing,
      specialDateRates: [{ fromDate: "2026-08-09", toDate: "2026-08-09", boardingRate: 55 }]
    }) === 40
);
expect(
  "Host booking keeps its server-side business-settings source",
  hostBookingsRoute.includes('.from("business_settings")')
    && hostBookingsRoute.includes("calculateServiceSubtotal")
);

if (failures.length) {
  console.error(`\nPublic pricing state validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nPublic pricing state validation passed.");
