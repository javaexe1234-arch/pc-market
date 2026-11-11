import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionPaysOrder, toStripeAmount } from "../src/lib/stripe";

const ORDER = { id: 7, totalUzs: BigInt(18_950_000) };
const paid = {
  payment_status: "paid" as const,
  metadata: { orderId: "7" },
  currency: "uzs",
  amount_total: 1_895_000_000,
};

describe("sessionPaysOrder", () => {
  it("counts sum in tiyin", () => {
    expect(toStripeAmount(18_950_000)).toBe(1_895_000_000);
  });
  it("accepts a full payment for this order", () => {
    expect(sessionPaysOrder(paid, ORDER)).toBe(true);
  });
  it.each([
    ["unpaid", { payment_status: "unpaid" as const }],
    ["another order", { metadata: { orderId: "8" } }],
    ["no order", { metadata: null }],
    ["another currency", { currency: "usd" }],
    ["a smaller amount", { amount_total: 1_894_999_999 }],
    ["an amount in sum, not tiyin", { amount_total: 18_950_000 }],
  ])("refuses %s", (_name, change) => {
    expect(sessionPaysOrder({ ...paid, ...change }, ORDER)).toBe(false);
  });
});

describe("Stripe webhook", () => {
  const SECRET = "whsec_test_secret";
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  const send = async (payload: string, signature?: string) => {
    const { POST } = await import("../src/app/api/stripe/webhook/route");
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (signature) headers["stripe-signature"] = signature;
    return POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers }));
  };
  const event = JSON.stringify({ id: "evt_1", object: "event", type: "customer.created", data: { object: {} } });
  const sign = (payload: string, secret = SECRET) =>
    new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload, secret });

  it("accepts an event signed with the endpoint secret", async () => {
    const response = await send(event, sign(event));
    expect(response.status).toBe(200);
  });
  it("refuses a missing, wrong or tampered signature", async () => {
    expect((await send(event)).status).toBe(400);
    expect((await send(event, sign(event, "whsec_other"))).status).toBe(400);
    expect((await send(event.replace("customer", "checkout"), sign(event))).status).toBe(400);
  });
  it("is off until both Stripe settings are present", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await send(event, sign(event))).status).toBe(503);
  });
});
