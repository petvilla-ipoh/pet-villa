import fs from "node:fs";
import ts from "typescript";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const check = (name, condition) => checks.push([name, Boolean(condition)]);

const authPage = read("apps/web/app/auth/page.tsx");
const callbackPage = read("apps/web/app/auth/callback/page.tsx");
const resetPage = read("apps/web/app/reset-password/page.tsx");
const accountPage = read("apps/web/app/account/page.tsx");
const authSession = read("apps/web/app/lib/authSession.ts");
const profileRoute = read("apps/web/app/api/customer/profile/route.ts");
const migration = read("database/migrations/20260814205918_customer_auth_profile_phone.sql");
const siteUrlHelper = read("apps/web/app/lib/siteUrl.ts");

function loadSiteUrlHelper({ configuredSiteUrl, windowOrigin } = {}) {
  const compiled = ts.transpileModule(siteUrlHelper, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const run = new Function("module", "exports", "process", "window", compiled);
  run(
    module,
    module.exports,
    { env: configuredSiteUrl ? { NEXT_PUBLIC_SITE_URL: configuredSiteUrl } : {} },
    windowOrigin ? { location: { origin: windowOrigin } } : undefined,
  );
  return module.exports;
}

const productionSiteUrl = loadSiteUrlHelper({ configuredSiteUrl: "https://www.petvilla.my/" });
const previewSiteUrl = loadSiteUrlHelper({ windowOrigin: "https://pet-villa-preview.vercel.app/" });
const serverFallbackSiteUrl = loadSiteUrlHelper();

check("Customer signup uses Supabase Email + Password", authPage.includes("supabase.auth.signUp") && authPage.includes("emailRedirectTo"));
check("Customer login uses Supabase Email + Password", authPage.includes("supabase.auth.signInWithPassword({ email: loginEmail, password })"));
check("Phone is registration contact metadata", authPage.includes("full_name: fullName") && authPage.includes("phone,"));
check("Phone is not a customer login identifier", !authPage.includes("emailOrPhone") && !authPage.includes("signInWithOtp"));
check("Fixed demo OTP is removed", !authPage.includes("123456") && !accountPage.includes("123456"));
check("Demo preview login is removed", !authPage.includes("PREVIEW_ACCOUNT") && !authPage.includes("getPreviewAccount"));
check("Password recovery sends a real Supabase email", authPage.includes("resetPasswordForEmail") && authPage.includes('getAuthRedirectUrl("/reset-password")'));
check("Customer confirmation callback exchanges PKCE code", callbackPage.includes("exchangeCodeForSession") && callbackPage.includes("syncSupabaseSessionToLocalStorage"));
check("Customer reset uses Supabase updateUser", resetPage.includes("auth.updateUser({ password })") && resetPage.includes("auth.signOut()"));
check("Customer reset maps only Supabase same_password to the friendly same-password message", resetPage.includes('code === "same_password"') && resetPage.includes("Your new password must be different from your current password.") && resetPage.includes("新密码不能与当前密码相同，请设置一个不同的密码。"));
check("Customer reset keeps invalid and expired recovery errors separate", resetPage.includes("INVALID_RECOVERY_LINK") && resetPage.includes("This password recovery link is invalid or has expired. Please request a new one.") && resetPage.includes('code === "otp_expired"') && resetPage.includes('code === "bad_code_verifier"'));
check("Customer reset keeps session and network failures separate", resetPage.includes("MISSING_RECOVERY_SESSION") && resetPage.includes("NETWORK_ERROR") && resetPage.includes('code === "session_not_found"'));
check("Customer reset has an independent new-password visibility toggle", resetPage.includes("showPassword, setShowPassword") && resetPage.includes('type={showPassword ? "text" : "password"}') && resetPage.includes("setShowPassword((value) => !value)"));
check("Customer reset has an independent confirmation visibility toggle", resetPage.includes("showConfirmation, setShowConfirmation") && resetPage.includes('type={showConfirmation ? "text" : "password"}') && resetPage.includes("setShowConfirmation((value) => !value)"));
check("Account profile uses protected customer API", accountPage.includes('fetchAuthenticatedCustomerJson<CustomerProfileResponse>("/api/customer/profile"'));
check("Account password change reauthenticates", accountPage.includes("signInWithPassword") && accountPage.includes("auth.updateUser"));
check("Account email is read only", accountPage.includes("readOnly disabled"));
check("Fake account verification controls are removed", !accountPage.includes("verifyOtp") && !accountPage.includes("beginVerification"));
check("Plaintext password registry is only removed, never written", !authPage.includes("pet-villa-registered-user") && !accountPage.includes("pet-villa-registered-user") && authSession.includes("clearObsoleteCustomerPasswordStorage"));
check("Supabase session is the auth source", !authSession.includes("NEXT_PUBLIC_ENABLE_CUSTOMER_LOCAL_FALLBACK") && authSession.includes("supabase.auth.getSession"));
check("Profile API validates customer JWT", profileRoute.includes("authorizeCustomerRequest(request)"));
check("Profile API scopes reads and writes to authenticated user", (profileRoute.match(/\.eq\("id", authorization\.user\.id\)/g) || []).length >= 2);
check("Profile API does not accept authorization role", !profileRoute.includes("body.role") && !profileRoute.includes("role:"));
check("Profile API keeps login email read only", !profileRoute.includes("body.email"));
check("Migration persists Auth phone metadata", migration.includes("new.raw_user_meta_data->>'phone'"));
check("Migration creates customer role only for a new profile", migration.includes("'customer'") && !migration.includes("role = excluded.role"));
check("Migration preserves existing profile role", !/do update[\s\S]*\brole\s*=/.test(migration));
check("Production uses configured official site URL", productionSiteUrl.getSiteUrl() === "https://www.petvilla.my");
check("Customer confirmation uses official production origin", productionSiteUrl.getAuthRedirectUrl("/auth/callback?flow=signup") === "https://www.petvilla.my/auth/callback?flow=signup");
check("Customer recovery uses official production origin", productionSiteUrl.getAuthRedirectUrl("/reset-password") === "https://www.petvilla.my/reset-password");
check("Host recovery uses official production origin", productionSiteUrl.getAuthRedirectUrl("/host/reset-password") === "https://www.petvilla.my/host/reset-password");
check("Host Magic Link uses official production origin", productionSiteUrl.getAuthRedirectUrl("/host/auth/callback?flow=magic-link") === "https://www.petvilla.my/host/auth/callback?flow=magic-link");
check("Host invite uses official production origin", productionSiteUrl.getAuthRedirectUrl("/host/auth/callback?flow=invite") === "https://www.petvilla.my/host/auth/callback?flow=invite");
check("Preview keeps its current browser origin when no site URL is configured", previewSiteUrl.getSiteUrl() === "https://pet-villa-preview.vercel.app");
check("Existing Vercel production URL remains the server fallback", serverFallbackSiteUrl.getSiteUrl() === "https://the-pet-villa-ipoh-web.vercel.app");

let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures += 1;
}
console.log(`\n${checks.length - failures}/${checks.length} customer auth checks passed.`);
if (failures) process.exit(1);
