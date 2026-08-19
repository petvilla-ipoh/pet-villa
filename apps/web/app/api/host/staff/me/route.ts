import { NextResponse } from "next/server";
import { authorizeHostRequest } from "../../_lib/authorizeHost";

export async function GET(request: Request) {
  const authorization = await authorizeHostRequest(request, undefined, { allowInvited: true });
  if (!authorization.ok) return authorization.response;
  if (authorization.staffStatus === "invited" && authorization.staffMemberId) {
    const { error } = await authorization.admin
      .from("host_staff_members")
      .update({ status: "active", last_active_at: new Date().toISOString() })
      .eq("id", authorization.staffMemberId)
      .eq("status", "invited");
    if (error) return NextResponse.json({ error: "The accepted staff invitation could not be activated." }, { status: 500 });
    await authorization.admin.from("host_audit_log").insert({
      actor_id: authorization.user.id,
      target_user_id: authorization.user.id,
      action: "staff.invite_accepted",
      entity_type: "staff",
      entity_id: authorization.user.id,
      details: {}
    });
  } else if (authorization.staffMemberId) {
    await authorization.admin
      .from("host_staff_members")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", authorization.staffMemberId);
  }
  return NextResponse.json({
    userId: authorization.user.id,
    email: authorization.user.email || "",
    accessRole: authorization.accessRole,
    permissions: authorization.permissions,
    status: authorization.staffStatus === "invited" ? "active" : authorization.staffStatus
  });
}
