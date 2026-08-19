import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../_lib/authorizeHost";
import { normalizePermissions, STAFF_PERMISSIONS, STAFF_ROLES, STAFF_STATUSES } from "../../../../lib/staffAccess";

const updateSchema = z.object({
  accessRole: z.enum(STAFF_ROLES).optional(),
  status: z.enum(STAFF_STATUSES).optional(),
  permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional()
}).refine((value) => Object.keys(value).length > 0, { message: "No staff changes were provided." });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeHostRequest(request, "staff.manage");
  if (!authorization.ok) return authorization.response;
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid staff changes." }, { status: 400 });

  const { data: target, error: targetError } = await authorization.admin
    .from("host_staff_members")
    .select("*")
    .eq("id", id)
    .single();
  if (targetError || !target) return NextResponse.json({ error: "Staff member was not found." }, { status: 404 });

  const protectedOwner = target.access_role === "owner";
  if (protectedOwner && authorization.accessRole !== "owner") {
    return NextResponse.json({ error: "Only an Owner can manage another Owner." }, { status: 403 });
  }
  if (target.email.toLowerCase() === "canyonfsp@gmail.com" && (
    (parsed.data.accessRole && parsed.data.accessRole !== "owner")
    || (parsed.data.status && parsed.data.status !== "active")
  )) {
    return NextResponse.json({ error: "The primary Pet Villa owner must remain an active Owner." }, { status: 409 });
  }
  if ((parsed.data.accessRole === "owner" || parsed.data.accessRole === "admin") && authorization.accessRole !== "owner") {
    return NextResponse.json({ error: "Only an Owner can grant Owner or Admin access." }, { status: 403 });
  }

  const nextRole = parsed.data.accessRole || target.access_role;
  const updates = {
    ...(parsed.data.accessRole ? { access_role: parsed.data.accessRole } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.permissions || parsed.data.accessRole
      ? { permissions: normalizePermissions(nextRole, parsed.data.permissions) }
      : {}),
    updated_at: new Date().toISOString()
  };
  const authStatusChange = parsed.data.status === "suspended" || parsed.data.status === "disabled"
    ? "876000h"
    : parsed.data.status === "active" ? "none" : null;
  if (authStatusChange) {
    const { error: authError } = await authorization.admin.auth.admin.updateUserById(target.user_id, { ban_duration: authStatusChange });
    if (authError) return NextResponse.json({ error: "Supabase Auth could not apply the requested sign-in status." }, { status: 500 });
  }

  const { data: staffMember, error: updateError } = await authorization.admin
    .from("host_staff_members")
    .update(updates)
    .eq("id", target.id)
    .select("*")
    .single();
  if (updateError || !staffMember) {
    if (authStatusChange) {
      const rollbackDuration = target.status === "suspended" || target.status === "disabled" ? "876000h" : "none";
      await authorization.admin.auth.admin.updateUserById(target.user_id, { ban_duration: rollbackDuration });
    }
    return NextResponse.json({ error: updateError?.message || "Staff access could not be updated." }, { status: 409 });
  }

  await authorization.admin.from("host_audit_log").insert({
    actor_id: authorization.user.id,
    target_user_id: target.user_id,
    action: "staff.updated",
    entity_type: "staff",
    entity_id: target.user_id,
    details: { before: { accessRole: target.access_role, status: target.status }, after: parsed.data }
  });
  return NextResponse.json({ staff: staffMember });
}
