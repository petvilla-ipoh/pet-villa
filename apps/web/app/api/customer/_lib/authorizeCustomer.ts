import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type AuthorizedCustomer = {
  ok: true;
  admin: SupabaseClient;
  user: User;
};

type RejectedCustomer = {
  ok: false;
  response: NextResponse;
};

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function authorizeCustomerRequest(request: Request): Promise<AuthorizedCustomer | RejectedCustomer> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Customer services are not configured." }, { status: 503 })
    };
  }

  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "A verified customer session is required." }, { status: 401 })
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "The customer session is invalid or expired." }, { status: 401 })
    };
  }

  return { ok: true, admin, user: data.user };
}
