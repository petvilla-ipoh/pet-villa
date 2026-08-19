import { NextResponse } from "next/server";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

export async function GET(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.admin
    .from("pets")
    .select("id, owner_id, name, breed, weight_kg, age_text, gender, coat_color, vaccinated, neutered, friendly, calm, food_brand, meals_per_day, allergies, medication, special_notes, photo_url, photo_path")
    .eq("owner_id", authorization.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Customer pets query failed.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Your pets could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ pets: data || [] });
}
