import { NextResponse } from "next/server";
import { authorizeHostRequest } from "../_lib/authorizeHost";

export async function GET(request: Request) {
  const authorization = await authorizeHostRequest(request);
  if (!authorization.ok) return authorization.response;

  return NextResponse.json({
    authenticated: true,
    role: authorization.role,
    accessRole: authorization.accessRole,
    permissions: authorization.permissions,
    userId: authorization.user.id
  });
}
