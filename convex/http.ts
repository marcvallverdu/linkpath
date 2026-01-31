import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Verify Stripe webhook signature using HMAC-SHA256
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Parse the signature header: t=timestamp,v1=signature
  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;

  // Reject if timestamp is older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expectedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSig === sig;
}

// Stripe webhook handler
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify signature if webhook secret is configured
    if (webhookSecret) {
      if (!signature) {
        return new Response("Missing stripe-signature header", { status: 400 });
      }
      const valid = await verifyStripeSignature(body, signature, webhookSecret);
      if (!valid) {
        return new Response("Invalid signature", { status: 400 });
      }
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data as Record<string, unknown>;
      const sessionObj = session.object as Record<string, unknown>;
      const metadata = sessionObj.metadata as Record<string, string>;

      if (metadata?.orgId) {
        const isSubscription = sessionObj.mode === "subscription";
        await ctx.runMutation(internal.stripe.handleCheckoutCompleted, {
          orgId: metadata.orgId,
          profileId: metadata.profileId || "",
          stripeCustomerId: (sessionObj.customer as string) || "",
          stripeSubscriptionId: isSubscription
            ? (sessionObj.subscription as string) || undefined
            : undefined,
          type: metadata.type === "credit_pack" ? "credit_pack" : "subscription",
          credits: metadata.credits ? Number(metadata.credits) : undefined,
        });
      }
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
