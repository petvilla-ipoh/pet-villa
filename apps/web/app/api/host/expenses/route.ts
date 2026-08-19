import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../_lib/authorizeHost";

const expenseSchema = z.object({
  requestId: z.string().uuid(),
  expenseDate: z.string().date(),
  amount: z.number().positive().max(999999.99).refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Expense amount must use no more than two decimal places."
  ),
  category: z.enum(["supplies", "utilities", "maintenance", "transport", "other"]),
  note: z.string().trim().max(1000).default("")
});

function expenseFromRow(row: Record<string, unknown>) {
  return {
    id: String(row.id || ""),
    expenseDate: String(row.expense_date || ""),
    amount: Number(row.amount_rm || 0),
    category: String(row.category || "other"),
    note: String(row.note || ""),
    createdAt: String(row.created_at || ""),
    createdBy: row.created_by ? String(row.created_by) : null
  };
}

export async function GET(request: Request) {
  const authorization = await authorizeHostRequest(request, "payments.view");
  if (!authorization.ok) return authorization.response;
  const { data, error } = await authorization.admin
    .from("business_expenses")
    .select("id,expense_date,amount_rm,category,note,created_by,created_at")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[host/expenses] load failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ error: "Business expenses could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ expenses: (data || []).map((row) => expenseFromRow(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const authorization = await authorizeHostRequest(request, "payments.manage");
  if (!authorization.ok) return authorization.response;
  const parsed = expenseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid expense." }, { status: 400 });
  }
  const { data, error } = await authorization.admin.rpc("record_host_business_expense", {
    p_request_id: parsed.data.requestId,
    p_actor_user_id: authorization.user.id,
    p_expense_date: parsed.data.expenseDate,
    p_amount_rm: parsed.data.amount,
    p_category: parsed.data.category,
    p_note: parsed.data.note
  });
  if (error || !data) {
    console.error("[host/expenses] record failed", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });
    return NextResponse.json({ error: "The expense could not be saved." }, { status: 500 });
  }
  const result = data as Record<string, unknown>;
  return NextResponse.json({
    expense: {
      id: String(result.expense_id || ""),
      expenseDate: String(result.expense_date || parsed.data.expenseDate),
      amount: Number(result.amount || parsed.data.amount),
      category: String(result.category || parsed.data.category),
      note: parsed.data.note,
      createdAt: new Date().toISOString(),
      createdBy: authorization.user.id
    }
  });
}
