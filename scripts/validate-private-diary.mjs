import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const migration = read("database/migrations/202608060001_create_supabase_pet_diary.sql");
const helper = read("apps/web/app/lib/diaryUpdates.ts");
const host = read("apps/web/app/host/page.tsx");
const customerDiary = read("apps/web/app/diary/page.tsx");
const home = read("apps/web/app/page.tsx");

const checks = [
  ["private diary table", migration.includes("CREATE TABLE IF NOT EXISTS public.pet_diary_updates")],
  ["private storage bucket", migration.includes("'pet-diary-media'") && migration.includes("false,")],
  ["owner scoped read policy", migration.includes("auth.uid() = owner_id")],
  ["host-only writes", migration.includes('CREATE POLICY "pet_diary_insert_host"') && migration.includes("public.current_user_is_host()")],
  ["database order eligibility trigger", migration.includes("validate_pet_diary_order_eligibility") && migration.includes("BEFORE INSERT OR UPDATE")],
  ["pending and cancelled excluded", !migration.match(/status IN \([^)]*pending_verification/) && migration.includes("orders.status IN ('balance', 'confirmed'")],
  ["owner and order foreign key", migration.includes("pet_diary_owner_order_fk")],
  ["complete care fields", ["water_notes", "toilet_notes", "health_notes", "medication_notes", "care_notes", "reminder_notes"].every((field) => migration.includes(field) && helper.includes(field))],
  ["host customer pet booking flow", host.includes("1. Search customer") && host.includes("2. Pet") && host.includes("3. Booking / order")],
  ["host edit and delete", host.includes("editDiaryEntry") && helper.includes("updatePetDiaryUpdate") && host.includes("removeDiaryEntry")],
  ["host history filters", host.includes("diaryHistoryOrder") && host.includes("diaryHistoryPet") && host.includes("diaryHistoryDate")],
  ["crm diary shortcut", host.includes("Open Diary") && host.includes("Add Diary Update")],
  ["customer multi-pet switch", customerDiary.includes("selectedPetId") && customerDiary.includes("customer-diary-pets")],
  ["home does not read private diary", !home.includes("diaryUpdates") && !home.includes("pet_diary_updates")]
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  throw new Error(`Private Diary checks failed: ${failed.map(([name]) => name).join(", ")}`);
}

console.log(`Validated ${checks.length} Private Diary privacy, workflow, and persistence checks.`);
