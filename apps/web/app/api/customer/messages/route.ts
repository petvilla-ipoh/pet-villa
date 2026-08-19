import { NextResponse } from "next/server";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

export async function GET(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.admin
    .from("chat_messages")
    .select("id, thread_id, owner_id, owner_name, owner_phone, sender_role, body, created_at")
    .eq("owner_id", authorization.user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Customer messages query failed.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Your messages could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ messages: data || [] });
}
