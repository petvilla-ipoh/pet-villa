import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeMalaysiaPhone } from "../../../lib/phoneNormalization";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

const completionSchema = z.object({
  phone: z.string().trim().min(8).max(30)
});

function isGoogleUser(user: { app_metadata?: Record<string, unknown> }) {
  const provider = String(user.app_metadata?.provider || "");
  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.map(String)
    : [];
  return provider === "google" || providers.includes("google");
}

export async function GET(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;
  if (!isGoogleUser(authorization.user)) {
    return NextResponse.json({ error: "This profile completion flow is only available after Google login." }, { status: 403 });
  }

  const { data: profile, error } = await authorization.admin
    .from("profiles")
    .select("id,full_name,phone,email")
    .eq("id", authorization.user.id)
    .maybeSingle();
  if (error) {
    console.error("[customer/google-profile] profile read failed", error);
    return NextResponse.json({ error: "Your Google customer profile could not be loaded." }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Your customer profile is not ready yet. Please try again." }, { status: 409 });
  }

  return NextResponse.json({
    profile: {
      fullName: profile.full_name || authorization.user.user_metadata?.full_name || authorization.user.user_metadata?.name || "",
      phone: profile.phone || "",
      email: authorization.user.email || profile.email || ""
    },
    phoneComplete: Boolean(normalizeMalaysiaPhone(profile.phone || ""))
  });
}

export async function POST(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;
  if (!isGoogleUser(authorization.user) || !authorization.user.email_confirmed_at) {
    return NextResponse.json({ error: "A verified Google customer session is required." }, { status: 403 });
  }

  const parsed = completionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid Malaysia phone number is required." }, { status: 400 });
  }
  if (!normalizeMalaysiaPhone(parsed.data.phone)) {
    return NextResponse.json({ error: "Enter a valid Malaysia phone number." }, { status: 400 });
  }

  const { error: profileError } = await authorization.admin
    .from("profiles")
    .update({ phone: parsed.data.phone })
    .eq("id", authorization.user.id);
  if (profileError) {
    console.error("[customer/google-profile] profile update failed", profileError);
    return NextResponse.json({ error: "Your contact profile could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phoneComplete: true });
}
