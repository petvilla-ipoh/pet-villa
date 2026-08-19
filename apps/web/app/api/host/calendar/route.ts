import { NextResponse } from "next/server";
import { authorizeHostRequest } from "../_lib/authorizeHost";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const authorization = await authorizeHostRequest(request, "calendar.manage");
  if (!authorization.ok) return authorization.response;

  const body = await request.json().catch(() => null) as { day?: unknown; full?: unknown } | null;
  const day = typeof body?.day === "string" ? body.day : "";
  const full = body?.full;
  if (!BUSINESS_DATE_PATTERN.test(day) || typeof full !== "boolean") {
    return NextResponse.json({ error: "A valid Malaysia business date and availability state are required." }, { status: 400 });
  }

  const query = full
    ? authorization.admin.from("host_off_days").upsert(
        { day, created_by: authorization.user.id },
        { onConflict: "day" }
      )
    : authorization.admin.from("host_off_days").delete().eq("day", day);
  const { error } = await query;

  if (error) {
    console.error("[host/calendar] availability update failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Calendar availability could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ day, full });
}
