import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(name, condition) {
  if (!condition) failures.push(name);
  else console.log(`PASS ${name}`);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const middleware = read("apps/web/middleware.ts");
const login = read("apps/web/app/host/login/page.tsx");
const reset = read("apps/web/app/host/reset-password/page.tsx");
const callback = read("apps/web/app/host/auth/callback/page.tsx");
const security = read("apps/web/app/host/HostSecurityPanel.tsx");
const authErrors = read("apps/web/app/lib/hostAuthErrors.ts");
const hostPage = read("apps/web/app/host/page.tsx");
const authorization = read("apps/web/app/api/host/_lib/authorizeHost.ts");
const siteUrl = read("apps/web/app/lib/siteUrl.ts");

expect("Production site URL is canonical", siteUrl.includes("https://the-pet-villa-ipoh-web.vercel.app"));
expect("Host recovery uses the Host reset page", login.includes('redirectTo: getAuthRedirectUrl("/host/reset-password")'));
expect("Host magic link uses the Host callback", login.includes('emailRedirectTo: getAuthRedirectUrl("/host/auth/callback?flow=magic-link")'));
expect("Recovery exchanges the PKCE code", reset.includes("exchangeCodeForSession(code)"));
expect("Recovery updates the authenticated password", reset.includes("auth.updateUser({ password })"));
expect("Recovery verifies Host role", reset.includes("isHostRole(profile.role)"));
expect("Magic callback exchanges the PKCE code", callback.includes("exchangeCodeForSession(code)"));
expect("Magic callback verifies formal Staff access", callback.includes('fetch("/api/host/staff/me"') && callback.includes("accessResponse.status === 403"));
expect("Magic callback records the one-time password prompt", callback.includes("HOST_MAGIC_LINK_NOTICE_KEY"));
expect("Host Settings exposes the Security workspace", hostPage.includes('<HostSecurityPanel initialMode="set" />'));
expect("Set Password updates the current authenticated user", security.includes("supabase.auth.updateUser({ password: newPassword })"));
expect("Change Password re-verifies the current password", security.includes("supabase.auth.signInWithPassword"));
expect("Password updates deliberately sign out", security.includes("await supabase.auth.signOut()"));
expect("Passwords are not persisted in browser storage", !security.includes("localStorage.setItem") && !security.includes("sessionStorage.setItem"));
expect("Rate limit mapping requires status or Supabase rate-limit code", authErrors.includes('status === 429') && authErrors.includes('code === "over_request_rate_limit"') && authErrors.includes('code === "over_email_send_rate_limit"'));
expect("Login clears restored error state", login.includes('window.addEventListener("pageshow", clearRestoredError)'));
expect("Direct Host routes are middleware protected", middleware.includes('matcher: ["/host/:path*"]'));
expect("Host middleware reassembles chunked Auth cookies", middleware.includes("readChunkedAuthCookie") && middleware.includes("await readAuthCookie(request)"));
expect("Host middleware validates the JWT with Supabase Auth", middleware.includes("/auth/v1/user"));
expect("Host middleware checks formal Staff membership first", middleware.includes("host_staff_members") && middleware.includes('staffMember.status === "active"'));
expect("Host middleware denies inactive Staff", middleware.includes("host-access-denied"));
expect("Host middleware never authorizes from profiles.role", !middleware.includes("select=role") && !middleware.includes("isHostRole"));
expect("Host API returns 401 for missing or invalid JWT", (authorization.match(/status: 401/g) || []).length >= 2);
expect("Host API returns 403 for a non-Host role", authorization.includes("status: 403"));
expect("Host API authenticates bearer JWT with Supabase", authorization.includes("admin.auth.getUser(token)"));
expect("Host API authorizes from formal Staff only", authorization.includes('.from("host_staff_members")') && !authorization.includes('.from("profiles")'));
expect("Host API fails closed when Staff row is missing", authorization.includes("This account does not have Host permission") && !authorization.includes("staffTableMissing"));
expect("Service role helper is explicitly server-only", authorization.startsWith('import "server-only";'));

const clientFiles = walk(path.join(root, "apps/web/app"))
  .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
  .filter((file) => read(path.relative(root, file)).includes('"use client"'));
const leakedClientFiles = clientFiles.filter((file) => fs.readFileSync(file, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"));
expect("Service role key is absent from client modules", leakedClientFiles.length === 0);

const applicationFiles = walk(path.join(root, "apps/web/app"))
  .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
const hardcodedLocalUrls = applicationFiles.filter((file) => /https?:\/\/(localhost|127\.0\.0\.1)/i.test(fs.readFileSync(file, "utf8")));
expect("Web application code has no hardcoded localhost URL", hardcodedLocalUrls.length === 0);

if (failures.length) {
  console.error(`\nHost authentication validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nHost authentication validation passed.");
