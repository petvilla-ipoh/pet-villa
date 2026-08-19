import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { authorizeHostRequest } from "../_lib/authorizeHost";
import { getAuthRedirectUrl } from "../../../lib/siteUrl";
import { isStaffRole, normalizePermissions, STAFF_PERMISSIONS, STAFF_ROLES } from "../../../lib/staffAccess";

const inviteSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(2).max(100),
  accessRole: z.enum(STAFF_ROLES),
  permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional()
});

async function writeAudit(
  admin: SupabaseClient,
  actorId: string,
  targetUserId: string | null,
  action: string,
  details: Record<string, unknown>
) {
  await admin.from("host_audit_log").insert({
    actor_id: actorId,
    target_user_id: targetUserId,
    action,
    entity_type: "staff",
    entity_id: targetUserId,
    details
  });
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const matched = data.users.find((user) => user.email?.trim().toLowerCase() === target);
    if (matched) return matched;
    if (data.users.length < 1000) break;
  }
  return null;
}

export async function GET(request: Request) {
  const authorization = await authorizeHostRequest(request, "staff.view");
  if (!authorization.ok) return authorization.response;

  const [{ data: staff, error: staffError }, { data: audit, error: auditError }] = await Promise.all([
    authorization.admin.from("host_staff_members").select("*").order("created_at", { ascending: true }),
    authorization.permissions.includes("audit.view")
      ? authorization.admin.from("host_audit_log").select("*").order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (staffError) {
    const missing = staffError.code === "42P01" || staffError.code === "PGRST205";
    return NextResponse.json({
      error: missing ? "Staff & Access database is not configured." : "Staff records could not be loaded.",
      migrationRequired: missing
    }, { status: missing ? 503 : 500 });
  }
  if (auditError) return NextResponse.json({ error: "Audit Log could not be loaded." }, { status: 500 });

  return NextResponse.json({ staff, audit, current: {
    userId: authorization.user.id,
    accessRole: authorization.accessRole,
    permissions: authorization.permissions
  } });
}

export async function POST(request: Request) {
  const authorization = await authorizeHostRequest(request, "staff.manage");
  if (!authorization.ok) return authorization.response;
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid staff invitation." }, { status: 400 });

  const { email, displayName, accessRole, permissions } = parsed.data;
  if ((accessRole === "owner" || accessRole === "admin") && authorization.accessRole !== "owner") {
    return NextResponse.json({ error: "Only an Owner can invite another Owner or Admin." }, { status: 403 });
  }

  let authUser;
  let existingAuthUser = false;
  try {
    authUser = await findAuthUserByEmail(authorization.admin, email);
    existingAuthUser = Boolean(authUser);
  } catch (error) {
    console.error("[host/staff] existing Auth user lookup failed", error);
    return NextResponse.json({ error: "The existing login account could not be checked safely." }, { status: 500 });
  }

  if (!authUser) {
    const { data: inviteData, error: inviteError } = await authorization.admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: getAuthRedirectUrl("/host/auth/callback?flow=invite"),
      data: { full_name: displayName, invited_by: authorization.user.id }
    });
    if (inviteError || !inviteData.user) {
      console.error("[host/staff] invitation failed", { code: inviteError?.code, status: inviteError?.status });
      return NextResponse.json({ error: "Supabase could not create or invite this staff login." }, { status: 400 });
    }
    authUser = inviteData.user;
  }

  const normalized = normalizePermissions(accessRole, permissions);
  const { data: existingProfile, error: profileLookupError } = await authorization.admin
    .from("profiles")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();
  if (profileLookupError) {
    console.error("[host/staff] profile lookup failed", profileLookupError);
    return NextResponse.json({ error: "The staff profile could not be checked." }, { status: 500 });
  }
  const profileResult = existingProfile
    ? await authorization.admin.from("profiles").update({
        email,
        full_name: displayName,
        updated_at: new Date().toISOString()
      }).eq("id", authUser.id)
    : await authorization.admin.from("profiles").insert({
        id: authUser.id,
        email,
        full_name: displayName,
        role: "customer",
        updated_at: new Date().toISOString()
      });
  const profileError = profileResult.error;
  if (profileError) return NextResponse.json({ error: "The staff profile could not be saved." }, { status: 500 });

  const { data: staffMember, error: staffError } = await authorization.admin.from("host_staff_members").upsert({
    user_id: authUser.id,
    email,
    display_name: displayName,
    access_role: accessRole,
    status: existingAuthUser ? "active" : "invited",
    permissions: normalized,
    invited_by: authorization.user.id,
    invited_at: new Date().toISOString()
  }, { onConflict: "user_id" }).select("*").single();
  if (staffError || !staffMember) return NextResponse.json({ error: staffError?.message || "Staff access could not be saved." }, { status: 500 });

  await writeAudit(authorization.admin, authorization.user.id, authUser.id, existingAuthUser ? "staff.access_granted" : "staff.invited", {
    email,
    accessRole,
    existingAuthUser
  });
  return NextResponse.json({ staff: staffMember }, { status: 201 });
}
