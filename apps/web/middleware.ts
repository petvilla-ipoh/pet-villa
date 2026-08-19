import { NextResponse, type NextRequest } from "next/server";
import { readChunkedAuthCookie } from "./app/lib/authCookieStorage";
import { isStaffRole, isStaffStatus } from "./app/lib/staffAccess";

const AUTH_COOKIE_KEY = "sb-pet-villa-auth-token";
const PUBLIC_HOST_PATHS = ["/host/login", "/host/reset-password", "/host/auth/callback"];

async function readAuthCookie(request: NextRequest) {
  return readChunkedAuthCookie(
    AUTH_COOKIE_KEY,
    (name) => request.cookies.get(name)?.value
  );
}

function readAccessToken(value: string) {
  try {
    const parsed = JSON.parse(value) as { access_token?: unknown };
    return typeof parsed.access_token === "string" ? parsed.access_token : "";
  } catch {
    return "";
  }
}

function loginRedirect(request: NextRequest, error?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/host/login";
  url.search = "";
  url.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  if (PUBLIC_HOST_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = readAccessToken((await readAuthCookie(request)) || "");
  if (!supabaseUrl || !anonKey) return loginRedirect(request, "configuration");
  if (!accessToken) return loginRedirect(request);

  try {
    const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
    if (!userResponse.ok) return loginRedirect(request, "session-expired");
    const user = await userResponse.json() as { id?: string };
    if (!user.id) return loginRedirect(request, "session-expired");

    const staffResponse = await fetch(
      `${supabaseUrl}/rest/v1/host_staff_members?user_id=eq.${encodeURIComponent(user.id)}&select=access_role,status&limit=1`,
      { headers, cache: "no-store" }
    );
    if (staffResponse.ok) {
      const staffMembers = await staffResponse.json() as Array<{ access_role?: unknown; status?: unknown }>;
      const staffMember = staffMembers[0];
      if (staffMember && isStaffRole(staffMember.access_role) && isStaffStatus(staffMember.status) && staffMember.status === "active") {
        return NextResponse.next();
      }
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "?error=host-access-denied";
      return NextResponse.redirect(url);
    }

    return loginRedirect(request, "network");
  } catch {
    return loginRedirect(request, "network");
  }
}

export const config = {
  matcher: ["/host/:path*"]
};
