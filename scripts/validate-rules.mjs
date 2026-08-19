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
  "apps/mobile/App.tsx",
  "apps/web/app/host/page.tsx",
  "apps/web/app/host/login/page.tsx",
  "apps/web/app/components/HostAccessGate.tsx",
  "apps/web/app/api/host/customers/route.ts",
  "apps/web/app/api/host/customers/[customerId]/pets/route.ts",
  "apps/web/app/lib/hostData.ts",
  "apps/web/app/lib/hostOperations.ts",
  "apps/web/app/lib/hostAvailability.ts",
  "apps/web/app/lib/diaryUpdates.ts",
  "database/migrations/202608060001_create_supabase_pet_diary.sql",
  "database/migrations/202608060002_create_supabase_host_operations.sql"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const constants = fs.readFileSync(path.join(root, "packages/shared/src/constants.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "database/migrations/202605270001_create_pet_villa_core.sql"), "utf8");
const app = fs.readFileSync(path.join(root, "apps/mobile/App.tsx"), "utf8");
const authPage = fs.readFileSync(path.join(root, "apps/web/app/auth/page.tsx"), "utf8");
const routes = fs.readFileSync(path.join(root, "apps/api/src/routes.ts"), "utf8");
const repo = fs.readFileSync(path.join(root, "apps/api/src/repositories/petVillaRepository.ts"), "utf8");
const stripe = fs.readFileSync(path.join(root, "apps/api/src/services/stripeService.ts"), "utf8");
const fcm = fs.readFileSync(path.join(root, "apps/api/src/services/fcmService.ts"), "utf8");
const hostPage = fs.readFileSync(path.join(root, "apps/web/app/host/page.tsx"), "utf8");
const hostLogin = fs.readFileSync(path.join(root, "apps/web/app/host/login/page.tsx"), "utf8");
const hostGate = fs.readFileSync(path.join(root, "apps/web/app/components/HostAccessGate.tsx"), "utf8");
const hostCustomerRoute = fs.readFileSync(path.join(root, "apps/web/app/api/host/customers/route.ts"), "utf8");
const hostCustomerPetsRoute = fs.readFileSync(path.join(root, "apps/web/app/api/host/customers/[customerId]/pets/route.ts"), "utf8");
const hostAuthorization = fs.readFileSync(path.join(root, "apps/web/app/api/host/_lib/authorizeHost.ts"), "utf8");
const hostData = fs.readFileSync(path.join(root, "apps/web/app/lib/hostData.ts"), "utf8");
const hostOperations = fs.readFileSync(path.join(root, "apps/web/app/lib/hostOperations.ts"), "utf8");
const hostAvailability = fs.readFileSync(path.join(root, "apps/web/app/lib/hostAvailability.ts"), "utf8");
const diaryUpdates = fs.readFileSync(path.join(root, "apps/web/app/lib/diaryUpdates.ts"), "utf8");
const diaryMigration = fs.readFileSync(path.join(root, "database/migrations/202608060001_create_supabase_pet_diary.sql"), "utf8");
const hostOperationsMigration = fs.readFileSync(path.join(root, "database/migrations/202608060002_create_supabase_host_operations.sql"), "utf8");

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
  ["e2e flow script", fs.existsSync(path.join(root, "scripts/e2e-flow.mjs"))],
  ["CRM searches order IDs", hostPage.includes("customer.orders.map((order) => order.orderId)") && hostPage.includes("Name, phone, email, pet or order ID")],
  ["CRM Host customer is persistent and distinct from Auth", hostPage.includes("Permanent customer profile for phone or counter bookings. No login account is created.") && hostPage.includes("+ Login account")],
  ["CRM uses customer profile tabs", hostPage.includes('type CrmTab = "overview" | "pets" | "orders" | "payments"')],
  ["CRM loads Supabase profiles", hostCustomerRoute.includes('.from("profiles")') && hostCustomerRoute.includes("phone_verified")],
  ["CRM loads owner-scoped pets", hostCustomerRoute.includes('.from("pets")') && hostCustomerRoute.includes("owner_id")],
  ["Host customer failures are real", hostOperations.includes("throw new Error(payload.error") && hostOperations.includes("createHostCustomerAsHost")],
  ["Host pet create update delete", hostCustomerPetsRoute.includes("export async function POST") && hostCustomerPetsRoute.includes("export async function PATCH") && hostCustomerPetsRoute.includes("export async function DELETE")],
  ["Host pet writes preserve owner", hostCustomerPetsRoute.includes('customerSource === "host" ? "host_customer_id" : "owner_id"') && hostCustomerPetsRoute.includes("[ownerColumn]: customerId")],
  ["Host pet photo upload", hostCustomerPetsRoute.includes('PET_PHOTO_BUCKET = "pet-photos"') && hostCustomerPetsRoute.includes(".storage.from(PET_PHOTO_BUCKET).upload")],
  ["Host pet photo storage policies", hostOperationsMigration.includes("pet_photos_insert_owner_or_host") && hostOperationsMigration.includes("pet_photos_delete_owner_or_host")],
  ["Host login uses Supabase Auth and formal Staff access", hostLogin.includes("signInWithPassword") && hostLogin.includes('fetch("/api/host/staff/me"')],
  ["Host gate requires active Staff access", hostGate.includes('fetch("/api/host/staff/me"') && hostGate.includes("response.status === 403")],
  ["Host page is protected by one gate", hostPage.includes("<HostAccessGate><HostConsole /></HostAccessGate>")],
  ["Permanent customer API requires bearer auth", hostCustomerRoute.includes('authorizeHostRequest(request, "crm.manage")') && hostAuthorization.includes("bearerToken(request)") && hostAuthorization.includes("status: 401")],
  ["Permanent customer API requires formal active Staff", hostAuthorization.includes('.from("host_staff_members")') && hostAuthorization.includes('staffMember.status !== "active"') && hostAuthorization.includes("status: 403")],
  ["Service role stays server-only", hostAuthorization.includes("process.env.SUPABASE_SERVICE_ROLE_KEY") && !hostAuthorization.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")],
  ["Production CRM excludes staff and local fallback", hostCustomerRoute.includes('["host", "admin"].includes') && hostData.includes("allowDevelopmentFallback")],
  ["Calendar writes through protected Host API before local state", hostAvailability.includes('fetch("/api/host/calendar"') && hostAvailability.includes("if (!response.ok) throw")],
  ["Private Diary has no production fake success", diaryUpdates.includes('const mediaBucket = "pet-diary-media"') && diaryUpdates.includes("throw diaryError(error)")],
  ["Private Diary private bucket and RLS", diaryMigration.includes("'pet-diary-media'") && diaryMigration.includes("pet_diary_select_owner_or_host") && diaryMigration.includes("pet_diary_media_insert_host")],
  ["Production preview login is removed", !authPage.includes("PREVIEW_ACCOUNT") && !authPage.includes("NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN") && !authPage.includes("getPreviewAccount")]
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length > 0) {
  throw new Error(`Failed checks: ${failed.map(([name]) => name).join(", ")}`);
}

console.log(`Validated ${requiredFiles.length} files and ${checks.length} business-rule checks.`);
