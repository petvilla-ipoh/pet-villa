import { NextResponse } from "next/server";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

type ProfileUpdate = {
  fullName?: unknown;
  phone?: unknown;
};

function profileResponse(user: { id: string; email?: string; email_confirmed_at?: string }, profile: Record<string, unknown>) {
  return {
    id: user.id,
    fullName: String(profile.full_name || ""),
    phone: String(profile.phone || ""),
    email: String(user.email || profile.email || ""),
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: String(profile.created_at || "")
  };
}

export async function GET(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.admin
    .from("profiles")
    .select("id, full_name, phone, email, created_at")
    .eq("id", authorization.user.id)
    .maybeSingle();

  if (error) {
    console.error("Customer profile query failed.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Your profile could not be loaded." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Your customer profile is not available." }, { status: 404 });

  return NextResponse.json({ profile: profileResponse(authorization.user, data) });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const body = await request.json().catch(() => ({})) as ProfileUpdate;
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!fullName || !phone) {
    return NextResponse.json({ error: "Name and phone number are required." }, { status: 400 });
  }

  const { data, error } = await authorization.admin
    .from("profiles")
    .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
    .eq("id", authorization.user.id)
    .select("id, full_name, phone, email, created_at")
    .single();

  if (error) {
    console.error("Customer profile update failed.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Your profile could not be saved." }, { status: 500 });
  }

  const existingMetadata = authorization.user.user_metadata || {};
  const { error: authError } = await authorization.admin.auth.admin.updateUserById(authorization.user.id, {
    user_metadata: { ...existingMetadata, full_name: fullName, phone }
  });
  if (authError) {
    console.error("Customer auth metadata sync failed.", {
      status: authError.status,
      message: authError.message
    });
    return NextResponse.json({ error: "Your profile was saved, but your session details could not be synchronized. Please sign in again." }, { status: 500 });
  }

  return NextResponse.json({ profile: profileResponse(authorization.user, data) });
}
