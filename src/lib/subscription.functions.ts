import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const PLAN_VALUE = 10.0;
const PLAN_DESCRIPTION = "Assinatura mensal — Baralho Cigano";

async function asaasRequest(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurado");
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    console.error("Asaas error", res.status, body);
    throw new Error(
      `Asaas API ${res.status}: ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`,
    );
  }
  return body as Record<string, unknown>;
}

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { subscription: data };
  });

const createSubscriptionInput = z.object({
  name: z.string().min(2).max(120),
  cpfCnpj: z.string().min(11).max(20),
  phone: z.string().min(8).max(20).optional(),
  billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD", "UNDEFINED"]).default("UNDEFINED"),
});

export const createAsaasSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSubscriptionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string } | null)?.email ?? "";

    // Look up existing subscription
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = existing?.asaas_customer_id ?? null;

    // Create customer in Asaas if needed
    if (!customerId) {
      const customer = await asaasRequest("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          email,
          cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
          mobilePhone: data.phone?.replace(/\D/g, ""),
          externalReference: userId,
          notificationDisabled: false,
        }),
      });
      customerId = customer.id as string;
    }

    // Create subscription in Asaas — R$10/mês
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const sub = await asaasRequest("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: data.billingType,
        value: PLAN_VALUE,
        nextDueDate: nextDueDate.toISOString().slice(0, 10),
        cycle: "MONTHLY",
        description: PLAN_DESCRIPTION,
        externalReference: userId,
      }),
    });

    // Persist customer + subscription IDs (admin bypasses RLS)
    await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        asaas_customer_id: customerId,
        asaas_subscription_id: sub.id as string,
        status: existing?.status ?? "trialing",
        trial_ends_at: existing?.trial_ends_at ?? null,
      },
      { onConflict: "user_id" },
    );

    // Fetch first payment to get the checkout link
    const payments = await asaasRequest(
      `/subscriptions/${sub.id}/payments?limit=1`,
    );
    const firstPayment = (payments.data as Array<Record<string, unknown>>)?.[0];
    const invoiceUrl = (firstPayment?.invoiceUrl as string) ?? null;

    return { subscriptionId: sub.id as string, invoiceUrl };
  });

export const getCheckoutLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("asaas_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!sub?.asaas_subscription_id) return { invoiceUrl: null };
    const payments = await asaasRequest(
      `/subscriptions/${sub.asaas_subscription_id}/payments?limit=1&status=PENDING`,
    );
    const firstPayment = (payments.data as Array<Record<string, unknown>>)?.[0];
    return { invoiceUrl: (firstPayment?.invoiceUrl as string) ?? null };
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("asaas_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (sub?.asaas_subscription_id) {
      await asaasRequest(`/subscriptions/${sub.asaas_subscription_id}`, {
        method: "DELETE",
      });
    }
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userId);
    return { ok: true };
  });