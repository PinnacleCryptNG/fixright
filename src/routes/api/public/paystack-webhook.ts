import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paystack webhook. Verifies the x-paystack-signature header against the raw
 * body with the secret key before touching anything, then confirms the
 * booking idempotently (safe against retries and duplicate deliveries).
 */
export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("not configured", { status: 503 });

        const signature = request.headers.get("x-paystack-signature");
        const body = await request.text();
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const a = Buffer.from(signature ?? "");
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("invalid signature", { status: 401 });
        }

        let event: { event?: string; data?: { reference?: string } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("bad payload", { status: 400 });
        }

        if (event.event === "charge.success" && event.data?.reference) {
          const { handleChargeSuccess } = await import("@/lib/booking.server");
          await handleChargeSuccess(event.data.reference).catch(() => undefined);
        }
        return new Response("ok");
      },
    },
  },
});
