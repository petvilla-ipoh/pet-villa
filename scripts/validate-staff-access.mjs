import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(name);
}

const migration = read("database/migrations/202608070001_create_supabase_host_staff_access.sql");
const access = read("apps/web/app/lib/staffAccess.ts");
const authorization = read("apps/web/app/api/host/_lib/authorizeHost.ts");
const staffRoute = read("apps/web/app/api/host/staff/route.ts");
const staffUpdateRoute = read("apps/web/app/api/host/staff/[id]/route.ts");
const staffMeRoute = read("apps/web/app/api/host/staff/me/route.ts");
const staffPage = read("apps/web/app/host/staff/page.tsx");
const hostPage = read("apps/web/app/host/page.tsx");
const hostGate = read("apps/web/app/components/HostAccessGate.tsx");

expect("All five staff roles are defined", ["owner", "admin", "manager", "staff", "viewer"].every((role) => access.includes(`"${role}"`)));
expect("Staff status supports invite and access restriction", ["invited", "active", "suspended", "disabled"].every((status) => access.includes(`"${status}"`)));
expect("Staff and audit tables are created", migration.includes("CREATE TABLE IF NOT EXISTS public.host_staff_members") && migration.includes("CREATE TABLE IF NOT EXISTS public.host_audit_log"));
expect("Staff tables have RLS", migration.includes("ALTER TABLE public.host_staff_members ENABLE ROW LEVEL SECURITY") && migration.includes("ALTER TABLE public.host_audit_log ENABLE ROW LEVEL SECURITY"));
expect("Migration is atomic", migration.includes("BEGIN;") && migration.includes("COMMIT;"));
expect("Migration contains no destructive core-table statements", !/DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM\s+public\.(profiles|pets|orders|bookings)/i.test(migration));
expect("Sensitive Host writes have restrictive permission policies", (migration.match(/AS RESTRICTIVE/g) || []).length >= 20);
expect("Primary owner is protected in API and database", migration.includes("canyonfsp@gmail.com") && staffUpdateRoute.includes("canyonfsp@gmail.com"));
expect("At least one active Owner is enforced", migration.includes("remaining_active_owners < 1"));
expect("Only Owner and Admin can manage Staff", migration.includes("public.current_staff_access_role() = 'owner'") && migration.includes("public.current_staff_access_role() = 'admin'") && access.includes("PRIVILEGED_ACCESS_PERMISSIONS"));
expect("Non-privileged Staff can only select their own access row", migration.includes("user_id = auth.uid()") && migration.includes("public.current_staff_access_role() IN ('owner', 'admin')"));
expect("Audit Log rejects secrets", migration.includes("reject_sensitive_host_audit_details") && migration.includes("service_role_key"));
expect("Authorization checks active staff and required permissions", authorization.includes('staffMember.status !== "active"') && authorization.includes("requiredPermission"));
expect("Formal Staff membership is the sole Host authorization source", authorization.includes('.from("host_staff_members")') && !authorization.includes('.from("profiles")'));
expect("Suspended and disabled Staff fail closed", authorization.includes("This Host account is not active."));
expect("Staff APIs require view and manage permissions", staffRoute.includes('authorizeHostRequest(request, "staff.view")') && staffRoute.includes('authorizeHostRequest(request, "staff.manage")') && staffUpdateRoute.includes('authorizeHostRequest(request, "staff.manage")'));
expect("Staff invitation uses Supabase invite without a password", staffRoute.includes("inviteUserByEmail") && !staffRoute.includes("password:"));
expect("Invitation acceptance activates the staff record", staffMeRoute.includes('status: "active"') && staffMeRoute.includes("staff.invite_accepted"));
expect("Suspend and disable update Supabase Auth", staffUpdateRoute.includes("ban_duration") && staffUpdateRoute.includes("Supabase Auth could not apply"));
expect("Staff changes create Audit Log records", staffRoute.includes("host_audit_log") && staffUpdateRoute.includes("host_audit_log"));
expect("Staff has an independent protected Host page", staffPage.includes("<HostAccessGate>") && staffPage.includes("Staff & Access"));
expect("Staff page never requests or submits a password", !staffPage.includes('type="password"') && !staffPage.includes("password:"));
expect("Sidebar is permission filtered", hostPage.includes("canViewWorkspace(item.id)") && hostPage.includes('permission = workspace === "staff"'));
expect("Manage controls use permission state", hostPage.includes("data-host-readonly") && staffPage.includes("canEditSelected"));
expect("Host page fails closed while permissions are unavailable", hostPage.includes("if (!staffPermissions) return false") && hostPage.includes("setStaffPermissions([])"));
expect("Direct workspace selection is permission checked", hostPage.includes("WORKSPACE_VIEW_PERMISSIONS[activeWorkspace]") && hostPage.includes('setActiveWorkspace("dashboard")'));
expect("Host gate verifies active Staff access", hostGate.includes('fetch("/api/host/staff/me"') && hostGate.includes("response.status === 403"));

if (failures.length) {
  console.error(`\nStaff & Access validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nStaff & Access validation passed.");
