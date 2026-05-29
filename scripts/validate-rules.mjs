import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "docs/PRD.md",
  "docs/design/FigmaSpec.md",
  "docs/API.md",
  "database/migrations/202605270001_create_pet_villa_core.sql",
  "packages/shared/src/constants.ts",
  "packages/shared/src/booking.ts",
  "packages/shared/src/eligibility.ts",
  "packages/shared/src/pricing.ts",
  "apps/api/src/routes.ts",
  "apps/api/src/db.ts",
  "apps/api/src/repositories/petVillaRepository.ts",
  "apps/api/src/services/stripeService.ts",
  "apps/api/src/services/fcmService.ts",
  "apps/mobile/App.tsx"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const constants = fs.readFileSync(path.join(root, "packages/shared/src/constants.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "database/migrations/202605270001_create_pet_villa_core.sql"), "utf8");
const app = fs.readFileSync(path.join(root, "apps/mobile/App.tsx"), "utf8");
const routes = fs.readFileSync(path.join(root, "apps/api/src/routes.ts"), "utf8");
const repo = fs.readFileSync(path.join(root, "apps/api/src/repositories/petVillaRepository.ts"), "utf8");
const stripe = fs.readFileSync(path.join(root, "apps/api/src/services/stripeService.ts"), "utf8");
const fcm = fs.readFileSync(path.join(root, "apps/api/src/services/fcmService.ts"), "utf8");

const checks = [
  ["small dog minimum", constants.includes("minDogWeightKg: 1")],
  ["small dog maximum", constants.includes("maxDogWeightKg: 12")],
  ["daily capacity", constants.includes("maxDogsPerDay: 3")],
  ["overnight price", constants.includes("overnightBoardingPerNightSen: 4000")],
  ["daycare price", constants.includes("daycarePerHourSen: 500")],
  ["50 percent deposit", constants.includes("depositPercent: 50")],
  ["booking status enum", migration.includes("confirmed_awaiting_deposit") && migration.includes("awaiting_final_payment")],
  ["chat screen present", app.includes("ChatScreen")],
  ["postgres repository", repo.includes("INSERT INTO bookings") && repo.includes("INSERT INTO diary_entries")],
  ["host search route", routes.includes('apiRouter.get("/hosts"')],
  ["stripe payment intent", stripe.includes("paymentIntents.create")],
  ["stripe webhook route", routes.includes("/payments/stripe/webhook")],
  ["fcm push", fcm.includes("admin.messaging().send")],
  ["render config", fs.existsSync(path.join(root, "render.yaml"))],
  ["vercel config", fs.existsSync(path.join(root, "vercel.json"))],
  ["env template", fs.existsSync(path.join(root, ".env.example"))],
  ["e2e flow script", fs.existsSync(path.join(root, "scripts/e2e-flow.mjs"))]
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length > 0) {
  throw new Error(`Failed checks: ${failed.map(([name]) => name).join(", ")}`);
}

console.log(`Validated ${requiredFiles.length} files and ${checks.length} business-rule checks.`);
