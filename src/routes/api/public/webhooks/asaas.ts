import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TablesUpdate } from "@/integrations/supabase/types";

type AsaasPayment = {
  id?: string;
  status?: string;
  customer?: string;
  subscription?: string;
  externalReference?: string;
  nextDueDate?: string;
  dueDate?: string;
};

function addDays(dateStr: string | undefined, days: number) {
  const base = dateStr ? new Date(dateStr) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

export const Route = createFileRoute("/api/public/webhooks/asaas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ASAAS_WEBHOOK_TOKEN;
        const provided = request.headers.get("asaas-access-token");
        if (!expected || provided !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const event = String(payload.event ?? "");
        const payment = (payload.payment ?? {}) as AsaasPayment;
        const subscriptionEntity = (payload.subscription ?? {}) as {
          id?: string;
          status?: string;
          customer?: string;
          externalReference?: string;
        };

        const externalRef =
          payment.externalReference ?? subscriptionEntity.externalReference;
        const subscriptionId =
          payment.subscription ?? subscriptionEntity.id;
        const customerId = payment.customer ?? subscriptionEntity.customer;

        // Locate the user row
        let userQuery = supabaseAdmin.from("subscriptions").select("user_id");
        if (externalRef) {
          userQuery = userQuery.eq("user_id", externalRef);
        } else if (subscriptionId) {
          userQuery = userQuery.eq("asaas_subscription_id", subscriptionId);
        } else if (customerId) {
          userQuery = userQuery.eq("asaas_customer_id", customerId);
        } else {
          return new Response("no identifier", { status: 200 });
        }
        const { data: rows } = await userQuery.limit(1);
        const userId = rows?.[0]?.user_id;
        if (!userId) {
          console.warn("Asaas webhook: subscription not found", { event });
          return new Response("ok", { status: 200 });
        }

        const update: TablesUpdate<"subscriptions"> = {
          last_payment_id: payment.id ?? null,
          last_payment_status: payment.status ?? null,
        };

        switch (event) {
          case "PAYMENT_CONFIRMED":
          case "PAYMENT_RECEIVED":
            update.status = "active";
            update.current_period_end = addDays(payment.nextDueDate, 0);
            break;
          case "PAYMENT_OVERDUE":
            update.status = "past_due";
            break;
          case "PAYMENT_REFUNDED":
          case "PAYMENT_DELETED":
            update.status = "canceled";
            break;
          case "SUBSCRIPTION_DELETED":
            update.status = "canceled";
            break;
          case "SUBSCRIPTION_CREATED":
          case "SUBSCRIPTION_UPDATED":
            if (subscriptionEntity.id) {
              update.asaas_subscription_id = subscriptionEntity.id;
            }
            if (subscriptionEntity.customer) {
              update.asaas_customer_id = subscriptionEntity.customer;
            }
            break;
          default:
            // PAYMENT_CREATED, etc. — no state change
            break;
        }

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update(update)
          .eq("user_id", userId);
        if (error) {
          console.error("Failed to update subscription", error);
          return new Response("db error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});