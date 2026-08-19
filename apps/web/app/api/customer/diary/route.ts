import { NextResponse } from "next/server";
import { authorizeCustomerRequest } from "../_lib/authorizeCustomer";

export async function GET(request: Request) {
  const authorization = await authorizeCustomerRequest(request);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.admin
    .from("pet_diary_updates")
    .select("id, owner_id, order_id, booking_id, pet_id, pet_name, customer_name, mood, meal_notes, water_notes, activity_notes, toilet_notes, health_notes, medication_notes, care_notes, reminder_notes, body, health_alert, media, created_at")
    .eq("owner_id", authorization.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Customer diary query failed.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Your Private Diary could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ entries: data || [] });
}
