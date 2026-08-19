import fs from "node:fs";
import ts from "typescript";

const read = (path) => fs.readFileSync(path, "utf8");
const exists = (path) => fs.existsSync(path);
const checks = [];
const check = (name, condition) => checks.push([name, Boolean(condition)]);

const authPage = read("apps/web/app/auth/page.tsx");
const callbackPage = read("apps/web/app/auth/callback/page.tsx");
const completionPage = read("apps/web/app/auth/complete-profile/page.tsx");
const supabaseClient = read("apps/web/app/lib/supabase.ts");
const profileRoute = read("apps/web/app/api/customer/google-profile/route.ts");
const customerAuthorization = read("apps/web/app/api/customer/_lib/authorizeCustomer.ts");
const hostAuthorization = read("apps/web/app/api/host/_lib/authorizeHost.ts");
const authSession = read("apps/web/app/lib/authSession.ts");
const normalizerSource = read("apps/web/app/lib/phoneNormalization.ts");

function loadNormalizer() {
  const compiled = ts.transpileModule(normalizerSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", compiled)(module, module.exports);
  return module.exports.normalizeMalaysiaPhone;
}

const normalizeMalaysiaPhone = loadNormalizer();

check("Login and Register share Continue with Google", authPage.includes("Continue with Google") && authPage.includes("使用 Google 继续") && authPage.includes("const isLogin = mode === \"login\""));
check("Google uses the dedicated Supabase PKCE client", authPage.includes("getSupabaseGoogleOAuthClient()") && authPage.includes("signInWithOAuth") && authPage.includes('provider: "google"'));
check("Google uses the exact application callback", authPage.includes('getAuthRedirectUrl("/auth/callback?flow=google")'));
check("Email and password signup remains", authPage.includes("supabase.auth.signUp") && authPage.includes("emailRedirectTo"));
check("Email and password login remains", authPage.includes("supabase.auth.signInWithPassword"));
check("Password recovery remains", authPage.includes("resetPasswordForEmail") && authPage.includes('getAuthRedirectUrl("/reset-password")'));
check("Intended customer destination is preserved", authPage.includes("pet-villa-google-redirect") && callbackPage.includes("pet-villa-google-redirect") && callbackPage.includes("safeCustomerRedirect"));

check("Google callback exchanges PKCE code", callbackPage.includes("exchangeCodeForSession"));
check("Google callback disables competing automatic code exchange", callbackPage.includes('flow === "google"') && callbackPage.includes("getSupabaseGoogleOAuthClient()") && supabaseClient.includes("getSupabaseGoogleOAuthClient") && supabaseClient.includes("detectSessionInUrl: false"));
check("Google OAuth uses PKCE end to end", supabaseClient.includes('flowType: "pkce"'));
check("Google OAuth code is exchanged exactly once", (callbackPage.match(/exchangeCodeForSession\(/g) || []).length === 1);
check("Email confirmation keeps the established browser callback flow", callbackPage.includes(': getSupabaseBrowserClient()'));
check("Google OAuth errors are not mislabeled as expired email links", callbackPage.includes('flow === "google"') && callbackPage.includes("Google sign-in could not be completed.") && callbackPage.includes("This secure confirmation link is invalid or has expired."));
check("Google callback restores the Supabase session", callbackPage.includes("supabase.auth.getSession()") && callbackPage.includes("syncSupabaseSessionToLocalStorage"));
check("Callback uses authenticated Profile state only", callbackPage.includes('fetch("/api/customer/google-profile"'));
check("Missing phone enters one-time completion", callbackPage.includes("if (!body.phoneComplete)") && callbackPage.includes("/auth/complete-profile"));
check("Existing customer with phone continues to Portal", callbackPage.includes("window.location.replace(customerRedirect)"));

check("Profile completion asks only for phone", completionPage.includes('autoComplete="tel"') && !completionPage.includes('autoComplete="name"') && !completionPage.includes("setFullName"));
check("Phone is required business contact information", completionPage.includes("normalizeMalaysiaPhone(phone)") && completionPage.includes("required"));
check("Phone completion continues to Portal", completionPage.includes("window.location.replace(target)"));
check("Phone completion has no Host approval state", !completionPage.includes("pending") && !completionPage.includes("Host approval") && !completionPage.includes("Verification Needed"));
check("Phone completion updates only current user metadata", completionPage.includes('supabase.auth.updateUser({ data: { phone: phone.trim() } })') && !completionPage.includes("auth.admin"));

check("Malaysia local phone canonicalizes deterministically", normalizeMalaysiaPhone("012-345 6789") === "60123456789");
check("Malaysia country code canonicalizes deterministically", normalizeMalaysiaPhone("+60 12-345 6789") === "60123456789");
check("Normalizer rejects invalid contact values", normalizeMalaysiaPhone("3456789") === "" && normalizeMalaysiaPhone("customer-6789") === "");

check("Customer profile endpoint validates bearer JWT", profileRoute.includes("authorizeCustomerRequest(request)"));
check("Google provider proof comes from trusted app metadata", profileRoute.includes("app_metadata?.provider") && profileRoute.includes("app_metadata?.providers") && !profileRoute.includes("user_metadata?.provider"));
check("Phone write is scoped to authenticated Profile UUID", profileRoute.includes('.eq("id", authorization.user.id)') && profileRoute.includes(".update({ phone: parsed.data.phone })"));
check("Google flow never queries Host CRM", !profileRoute.includes("host_customers") && !profileRoute.includes("host_customer_pets") && !callbackPage.includes("host_customers"));
check("Google flow never creates an identity linkage", !profileRoute.includes("customer_identity_links") && !profileRoute.includes("host_customer_id") && !profileRoute.includes("verification_method"));
check("Google flow never claims by phone", !profileRoute.includes('.eq("phone"') && !profileRoute.includes('.eq("normalized_phone"') && !profileRoute.includes("phone match"));
check("Google flow never claims by CRM email", !profileRoute.includes("normalized_email") && !profileRoute.includes("verified_email") && !profileRoute.includes("email match"));
check("Google flow never creates a Host customer", !profileRoute.includes('.from("host_customers").insert') && !profileRoute.includes("createUser"));
check("No Host approval route remains", !exists("apps/web/app/api/host/customer-links/[linkId]/route.ts"));
check("No unexecuted identity migration remains", !exists("database/migrations/202608160001_create_supabase_customer_identity_links.sql"));

check("Customer JWT cannot authorize as Host", customerAuthorization.includes("admin.auth.getUser(token)") && hostAuthorization.includes("host_staff_members"));
check("Google customer local role defaults to customer", authSession.includes('|| "customer"'));

let failures = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures += 1;
}
console.log(`\n${checks.length - failures}/${checks.length} Google social login checks passed.`);
if (failures) process.exit(1);
