import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Stripe webhook handler
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // In production, verify the webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && !signature) {
      return new Response("Missing signature", { status: 400 });
    }

    // TODO: Verify signature with Stripe SDK in production
    // For now, parse the event directly
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
