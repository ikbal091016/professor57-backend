import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import { processStripeEvent, markOrderPaid, markOrderExpired, refundOrderByPaymentIntent } from "../services/payments.service";

/**
 * Stripe webhook receiver. Mounted with express.raw() (see app.ts) — signature
 * verification needs the exact raw request bytes, not the parsed JSON body.
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    return res.status(400).send("Missing Stripe signature header.");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  try {
    await processStripeEvent(event.id, event.type, async () => {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await markOrderPaid(session.id, (session.payment_intent as string) || null);
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          await markOrderExpired(session.id);
          break;
        }
        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          if (typeof charge.payment_intent === "string") {
            await refundOrderByPaymentIntent(charge.payment_intent);
          }
          break;
        }
        default:
          break; // Unhandled event types are safely ignored.
      }
    });

    res.json({ received: true });
  } catch (err) {
    console.error("[webhook] handler failed:", err);
    // Non-2xx tells Stripe to retry — safe, since processStripeEvent only records
    // the event ID after the handler resolves successfully.
    res.status(500).send("Webhook handler failed.");
  }
}
