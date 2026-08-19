import "server-only";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type HostOffDayRow = {
  day: string;
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Booking availability is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await admin
    .from("host_off_days")
    .select("day")
    .order("day", { ascending: true });

  if (error) {
    console.error("[public/availability] query failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json(
      { error: "Booking availability could not be loaded." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const fullDates = ((data || []) as HostOffDayRow[]).map((row) => row.day);
  return NextResponse.json(
    { fullDates },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
