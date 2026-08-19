import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { HostRole } from "../../../lib/hostAuth";
import {
  hasStaffPermission,
  isStaffRole,
  isStaffStatus,
  normalizePermissions,
  type StaffPermission,
  type StaffRole,
  type StaffStatus
} from "../../../lib/staffAccess";

type AuthorizedHost = {
  ok: true;
  admin: SupabaseClient;
  user: User;
  role: HostRole;
  accessRole: StaffRole;
  staffStatus: StaffStatus;
  staffMemberId: string | null;
  permissions: StaffPermission[];
};

type RejectedHost = {
  ok: false;
  response: NextResponse;
};

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

type AuthorizationOptions = {
  allowInvited?: boolean;
};

export async function authorizeHostRequest(
  request: Request,
  requiredPermission?: StaffPermission,
  options: AuthorizationOptions = {}
): Promise<AuthorizedHost | RejectedHost> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Host services are not configured." }, { status: 503 })
    };
  }

  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "A verified Host session is required." }, { status: 401 })
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "The Host session is invalid or expired." }, { status: 401 })
    };
  }

  const { data: staffMember, error: staffError } = await admin
    .from("host_staff_members")
    .select("id,access_role,status,permissions")
    .eq("user_id", callerData.user.id)
    .maybeSingle();

  if (staffError) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Staff access could not be verified." }, { status: 503 })
    };
  }

  if (staffMember) {
    if (!isStaffRole(staffMember.access_role) || !isStaffStatus(staffMember.status)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "This Host account has invalid access settings." }, { status: 403 })
      };
    }
    if (staffMember.status !== "active" && !(options.allowInvited && staffMember.status === "invited")) {
      return {
        ok: false,
        response: NextResponse.json({ error: "This Host account is not active." }, { status: 403 })
      };
    }

    const permissions = normalizePermissions(staffMember.access_role, staffMember.permissions);
    if (requiredPermission && !hasStaffPermission(permissions, requiredPermission)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "This Host account does not have the required permission." }, { status: 403 })
      };
    }

    return {
      ok: true,
      admin,
      user: callerData.user,
      role: staffMember.access_role === "owner" || staffMember.access_role === "admin" ? "admin" : "host",
      accessRole: staffMember.access_role,
      staffStatus: staffMember.status,
      staffMemberId: staffMember.id,
      permissions
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "This account does not have Host permission." }, { status: 403 })
  };
}
