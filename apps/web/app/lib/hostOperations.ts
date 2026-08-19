"use client";

import { getSupabaseBrowserClient } from "./supabase";
import type { PetProfile } from "./petProfiles";

export type HostCustomerUpdate = {
  fullName: string;
  phone: string;
  email: string;
};

export type HostCustomerAccountInput = HostCustomerUpdate & {
  password: string;
};

export type HostManagedCustomerInput = HostCustomerUpdate;

export type HostBookingInput = {
  requestId: string;
  mode: "existing" | "new";
  customerId?: string;
  customerSource?: "auth" | "host";
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  petIds: string[];
  newPet: { name: string; breed: string; photoDataUrl: string } | null;
  service: "overnight" | "daycare";
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  paid: number;
  discount: number;
};

export type BusinessExpenseCategory = "supplies" | "utilities" | "maintenance" | "transport" | "other";

export type BusinessExpense = {
  id: string;
  expenseDate: string;
  amount: number;
  category: BusinessExpenseCategory;
  note: string;
  createdAt: string;
  createdBy?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticatedClient() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return supabase;
}

async function hostApiRequest(path: string, init: RequestInit) {
  const supabase = await authenticatedClient();
  if (!supabase) throw new Error("The Host session could not be verified. Please sign in again.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("The Host session expired. Please sign in again.");
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
      ...(init.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The Host operation could not be completed.");
  return payload;
}

export async function createHostBookingAsHost(values: HostBookingInput) {
  return hostApiRequest("/api/host/bookings", { method: "POST", body: JSON.stringify(values) });
}

export async function verifyHostPaymentAsHost(orderRowId: string, mode: "submission" | "balance", paymentSubmissionId?: string) {
  if (!UUID_PATTERN.test(orderRowId)) throw new Error("This order is missing its permanent database identity.");
  if (mode === "submission" && (!paymentSubmissionId || !UUID_PATTERN.test(paymentSubmissionId))) {
    throw new Error("This payment is missing its durable submission identity. Refresh and try again.");
  }
  return hostApiRequest(`/api/host/orders/${encodeURIComponent(orderRowId)}/verify-payment`, {
    method: "POST",
    body: JSON.stringify({ mode, paymentSubmissionId })
  });
}

export async function rejectHostPaymentAsHost(orderRowId: string, paymentSubmissionId: string, reasonCode: "not_received" | "incorrect_amount" | "other" = "not_received", reason?: string) {
  if (!UUID_PATTERN.test(orderRowId) || !UUID_PATTERN.test(paymentSubmissionId)) {
    throw new Error("This payment is missing its durable submission identity. Refresh and try again.");
  }
  return hostApiRequest(`/api/host/orders/${encodeURIComponent(orderRowId)}/reject-payment`, {
    method: "POST",
    body: JSON.stringify({ paymentSubmissionId, reasonCode, reason })
  });
}

export async function prepareHostPaymentSubmissionAsHost(orderRowId: string) {
  if (!UUID_PATTERN.test(orderRowId)) throw new Error("This order is missing its permanent database identity.");
  return hostApiRequest(`/api/host/orders/${encodeURIComponent(orderRowId)}/payment-submission`, {
    method: "POST"
  }) as Promise<{ paymentSubmission?: { payment_submission_id?: string; amount?: number; method?: "qr" | "bank"; submitted_at?: string } }>;
}

export async function addOrderChargeAsHost(orderRowId: string, values: {
  requestId: string;
  amount: number;
  reasonCode: "late_checkout";
  note: string;
}) {
  if (!UUID_PATTERN.test(orderRowId)) throw new Error("This order is missing its permanent database identity.");
  return hostApiRequest(`/api/host/orders/${encodeURIComponent(orderRowId)}/charges`, {
    method: "POST",
    body: JSON.stringify(values)
  }) as Promise<{ charge: { id: string; amount: number }; order: { total: number; paid: number; balance: number; chargeTotal: number } }>;
}

export async function loadBusinessExpensesAsHost() {
  const payload = await hostApiRequest("/api/host/expenses", { method: "GET", cache: "no-store" }) as { expenses?: BusinessExpense[] };
  if (!Array.isArray(payload.expenses)) throw new Error("Business expenses were not returned by the Host API.");
  return payload.expenses;
}

export async function recordBusinessExpenseAsHost(values: {
  requestId: string;
  expenseDate: string;
  amount: number;
  category: BusinessExpenseCategory;
  note: string;
}) {
  return hostApiRequest("/api/host/expenses", {
    method: "POST",
    body: JSON.stringify(values)
  }) as Promise<{ expense: BusinessExpense }>;
}

export async function updateHostOrderAsHost(orderRowId: string, order: Record<string, unknown>, earlyCheckoutApproved = false) {
  if (!UUID_PATTERN.test(orderRowId)) throw new Error("This order is missing its permanent database identity.");
  return hostApiRequest(`/api/host/orders/${encodeURIComponent(orderRowId)}`, {
    method: "PATCH",
    body: JSON.stringify({ order, earlyCheckoutApproved })
  }) as Promise<{ order: Record<string, unknown> }>;
}

export async function createCustomerAccountAsHost(values: HostCustomerAccountInput) {
  const supabase = await authenticatedClient();
  if (!supabase) throw new Error("Sign in with a verified Host account before creating a customer login.");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("The Host session could not be verified. Please sign in again.");

  const response = await fetch("/api/host/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(values)
  });
  const payload = await response.json().catch(() => ({})) as {
    customer?: { id: string; fullName: string; phone: string; email: string; registeredAt: string };
    error?: string;
  };
  if (!response.ok || !payload.customer) {
    throw new Error(payload.error || "The registered customer account could not be created.");
  }
  return payload.customer;
}

export async function updateCustomerAsHost(customerId: string, customerSource: "auth" | "host", values: HostCustomerUpdate) {
  return hostApiRequest(`/api/host/customers/${encodeURIComponent(customerId)}`, {
    method: "PATCH",
    body: JSON.stringify({ customerSource, ...values })
  }) as Promise<{ persisted: boolean }>;
}

export async function createHostCustomerAsHost(values: HostManagedCustomerInput) {
  const payload = await hostApiRequest("/api/host/customers", {
    method: "POST",
    body: JSON.stringify({ accountType: "host", ...values })
  }) as {
    customer?: { id: string; fullName: string; phone: string; email: string; registeredAt: string; customerSource: "host" };
  };
  if (!payload.customer) throw new Error("The Host-managed customer was not returned after saving.");
  return payload.customer;
}

export async function savePetAsHost(ownerId: string, customerSource: "auth" | "host", pet: PetProfile) {
  return hostApiRequest(`/api/host/customers/${encodeURIComponent(ownerId)}/pets`, {
    method: UUID_PATTERN.test(pet.id) ? "PATCH" : "POST",
    body: JSON.stringify({ customerSource, pet })
  }) as Promise<{ persisted: boolean; pet: PetProfile }>;
}

export async function deletePetAsHost(ownerId: string, customerSource: "auth" | "host", pet: PetProfile) {
  return hostApiRequest(`/api/host/customers/${encodeURIComponent(ownerId)}/pets`, {
    method: "DELETE",
    body: JSON.stringify({ customerSource, petId: pet.id, photoPath: pet.photoPath })
  }) as Promise<{ persisted: boolean }>;
}
