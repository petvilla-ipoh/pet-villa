import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../_lib/authorizeHost";

const authAccountSchema = z.object({
  accountType: z.literal("auth").optional(),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).default(""),
  email: z.string().trim().email().or(z.literal("")),
  password: z.string().min(8).max(72)
}).refine((value) => Boolean(value.email || value.phone), {
  message: "An email address or phone number is required."
});

const hostCustomerSchema = z.object({
  accountType: z.literal("host"),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().or(z.literal(""))
});

export async function GET(request: Request) {
  const authorization = await authorizeHostRequest(request, "crm.view");
  if (!authorization.ok) return authorization.response;

  const [profilesResult, petsResult, hostCustomersResult, hostPetsResult] = await Promise.all([
    authorization.admin
      .from("profiles")
      .select("id, role, full_name, phone, email, created_at")
      .order("created_at", { ascending: false }),
    authorization.admin
      .from("pets")
      .select("id, owner_id, name, breed, weight_kg, age_text, gender, coat_color, vaccinated, neutered, friendly, calm, food_brand, meals_per_day, allergies, medication, special_notes, photo_url, photo_path, created_at")
      .order("created_at", { ascending: false }),
    authorization.admin
      .from("host_customers")
      .select("id, full_name, phone, email, created_at")
      .order("created_at", { ascending: false }),
    authorization.admin
      .from("host_customer_pets")
      .select("id, host_customer_id, name, breed, weight_kg, age_text, gender, coat_color, vaccinated, neutered, friendly, calm, food_brand, meals_per_day, allergies, medication, special_notes, photo_url, photo_path, created_at")
      .order("created_at", { ascending: false })
  ]);

  if (profilesResult.error) {
    console.error("[host/customers] profiles query failed", {
      message: profilesResult.error.message,
      code: profilesResult.error.code,
      details: profilesResult.error.details,
      hint: profilesResult.error.hint
    });
    return NextResponse.json({ error: "Customer profiles could not be loaded." }, { status: 500 });
  }
  if (petsResult.error) {
    console.error("[host/customers] pets query failed", {
      message: petsResult.error.message,
      code: petsResult.error.code,
      details: petsResult.error.details,
      hint: petsResult.error.hint
    });
    return NextResponse.json({ error: "Customer pet profiles could not be loaded." }, { status: 500 });
  }
  if (hostCustomersResult.error || hostPetsResult.error) {
    const error = hostCustomersResult.error || hostPetsResult.error;
    console.error("[host/customers] Host-created customer query failed", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });
    return NextResponse.json({ error: "Host-created customer records could not be loaded." }, { status: 500 });
  }

  const customers = (profilesResult.data || []).filter((profile) =>
    !["host", "admin"].includes(String(profile.role || "").toLowerCase())
  ).map((profile) => ({
    ...profile,
    phone_verified: false,
    email_verified: false,
    customer_source: "auth"
  }));
  const customerIds = new Set(customers.map((profile) => profile.id));
  const pets = (petsResult.data || [])
    .filter((pet) => customerIds.has(pet.owner_id))
    .map((pet) => ({ ...pet, customer_source: "auth" }));

  const hostCustomers = (hostCustomersResult.data || []).map((customer) => ({
    id: customer.id,
    role: "host_customer",
    full_name: customer.full_name,
    phone: customer.phone,
    email: customer.email,
    created_at: customer.created_at,
    phone_verified: false,
    email_verified: false,
    customer_source: "host"
  }));
  const hostPets = (hostPetsResult.data || []).map((pet) => ({
    ...pet,
    owner_id: pet.host_customer_id,
    customer_source: "host"
  }));

  return NextResponse.json({ customers: [...customers, ...hostCustomers], pets: [...pets, ...hostPets] });
}

export async function POST(request: Request) {
  const authorization = await authorizeHostRequest(request, "crm.manage");
  if (!authorization.ok) return authorization.response;

  const body = await request.json().catch(() => null);
  if (body?.accountType === "host") {
    const parsed = hostCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid customer profile details." }, { status: 400 });
    }
    const { data, error } = await authorization.admin.from("host_customers").insert({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      created_by: authorization.user.id
    }).select("id,full_name,phone,email,created_at").single();
    if (error || !data) {
      console.error("[host/customers] Host-managed customer create failed", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      return NextResponse.json({ error: "The customer profile could not be created." }, { status: 500 });
    }
    await authorization.admin.from("host_audit_log").insert({
      actor_id: authorization.user.id,
      action: "customer.created_by_host",
      entity_type: "host_customer",
      entity_id: data.id,
      details: { hasEmail: Boolean(data.email) }
    });
    return NextResponse.json({
      customer: {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        email: data.email || "",
        registeredAt: data.created_at,
        customerSource: "host"
      }
    }, { status: 201 });
  }

  const parsed = authAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid customer account details." }, { status: 400 });
  }

  const { fullName, phone, email, password } = parsed.data;
  const { data, error } = await authorization.admin.auth.admin.createUser({
    email: email || undefined,
    phone: phone || undefined,
    password,
    email_confirm: Boolean(email),
    phone_confirm: Boolean(phone),
    user_metadata: {
      full_name: fullName,
      phone,
      role: "owner",
      phone_verified: Boolean(phone),
      email_verified: Boolean(email),
      created_by_host: authorization.user.id
    }
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "Supabase could not create the customer login." }, { status: 400 });
  }

  const { error: profileWriteError } = await authorization.admin.from("profiles").upsert({
    id: data.user.id,
    full_name: fullName,
    phone,
    email,
    role: "owner",
    updated_at: new Date().toISOString()
  });
  if (profileWriteError) {
    await authorization.admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: `The login was rolled back because its customer profile could not be saved: ${profileWriteError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    customer: {
      id: data.user.id,
      fullName,
      phone,
      email,
      registeredAt: data.user.created_at
    }
  }, { status: 201 });
}
