import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../_lib/authorizeHost";

const requestSchema = z.object({
  customerSource: z.enum(["auth", "host"]),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().or(z.literal(""))
});

export async function PATCH(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const authorization = await authorizeHostRequest(request, "crm.manage");
  if (!authorization.ok) return authorization.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid customer details." }, { status: 400 });
  }

  const { customerId } = await context.params;
  const table = parsed.data.customerSource === "host" ? "host_customers" : "profiles";
  const { data, error } = await authorization.admin
    .from(table)
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null
    })
    .eq("id", customerId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[host/customers] update failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "The customer profile could not be saved." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "The customer record no longer exists." }, { status: 404 });

  await authorization.admin.from("host_audit_log").insert({
    actor_id: authorization.user.id,
    target_user_id: parsed.data.customerSource === "auth" ? customerId : null,
    action: "customer.updated_by_host",
    entity_type: parsed.data.customerSource === "host" ? "host_customer" : "profile",
    entity_id: customerId,
    details: { customerSource: parsed.data.customerSource }
  });

  return NextResponse.json({ customerId, persisted: true });
}
