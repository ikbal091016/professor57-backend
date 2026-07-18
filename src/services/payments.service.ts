import { Types } from "mongoose";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import { Order, IOrder } from "../models/Order";
import { Entitlement } from "../models/Entitlement";
import { WebhookEvent } from "../models/WebhookEvent";
import { Course } from "../models/Course";
import { AppError } from "../utils/AppError";

/**
 * Creates a pending Order and a matching Stripe Checkout Session for one or more
 * courses (a single course is the common case; multiple courseIds is how a simple
 * "bundle" purchase works — no separate bundle model needed).
 */
export async function startCheckout(params: {
  userId: string;
  userEmail: string;
  courseIds: string[];
  promotionCode?: string;
}) {
  const { userId, userEmail, courseIds, promotionCode } = params;

  const courses = await Course.find({ _id: { $in: courseIds }, published: true });
  if (courses.length !== courseIds.length) {
    throw new AppError("One or more courses could not be found.", 404, "COURSE_NOT_FOUND");
  }

  const alreadyOwned = await Entitlement.find({ userId, courseId: { $in: courseIds } }).lean();
  const ownedIds = new Set(alreadyOwned.map((e) => e.courseId.toString()));
  const toPurchase = courses.filter((c) => !ownedIds.has(c._id.toString()));

  if (toPurchase.length === 0) {
    throw new AppError("You already own every course in this order.", 409, "ALREADY_OWNED");
  }

  const amountCents = toPurchase.reduce((sum, c) => sum + Math.round(c.price * 100), 0);

  const order = await Order.create({
    userId,
    courseIds: toPurchase.map((c) => c._id),
    amountCents,
    status: "pending",
    couponCode: promotionCode,
  });

  let promoId: string | undefined;
  if (promotionCode) {
    const promos = await stripe.promotionCodes.list({ code: promotionCode, active: true, limit: 1 });
    promoId = promos.data[0]?.id;
    if (!promoId) throw new AppError("That promo code isn't valid.", 400, "INVALID_PROMO");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    line_items: toPurchase.map((course) => ({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(course.price * 100),
        product_data: { name: course.title, metadata: { courseId: course._id.toString() } },
      },
    })),
    discounts: promoId ? [{ promotion_code: promoId }] : undefined,
    metadata: { orderId: order._id.toString(), userId },
    success_url: `${env.clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/checkout/cancelled`,
  });

  order.stripeSessionId = session.id;
  await order.save();

  return { url: session.url!, orderId: order._id.toString() };
}

/** Grants lifetime entitlements for every course on a now-paid order. Safe to call more than once. */
async function grantEntitlementsForOrder(order: IOrder) {
  await Promise.all(
    order.courseIds.map((courseId) =>
      Entitlement.updateOne(
        { userId: order.userId, courseId },
        { $setOnInsert: { userId: order.userId, courseId, source: "stripe", lifetime: true } },
        { upsert: true }
      )
    )
  );
}

/** Revokes entitlements granted by a since-refunded order. */
async function revokeEntitlementsForOrder(order: IOrder) {
  await Entitlement.deleteMany({ userId: order.userId, courseId: { $in: order.courseIds } });
}

/**
 * Central webhook dispatcher. `eventId` dedupes retried deliveries before any side
 * effect runs — Stripe will retry a webhook that didn't return 2xx quickly enough,
 * and this must never double-grant or double-revoke.
 */
export async function processStripeEvent(eventId: string, type: string, handler: () => Promise<void>) {
  const alreadyProcessed = await WebhookEvent.exists({ provider: "stripe", eventId });
  if (alreadyProcessed) return;

  await handler();
  await WebhookEvent.create({ provider: "stripe", eventId, type });
}

export async function markOrderPaid(sessionId: string, paymentIntentId: string | null) {
  const order = await Order.findOne({ stripeSessionId: sessionId });
  if (!order) return; // Could be a session from another integration/environment — ignore.
  order.status = "paid";
  if (paymentIntentId) order.stripePaymentIntentId = paymentIntentId;
  await order.save();
  await grantEntitlementsForOrder(order);
}

export async function markOrderExpired(sessionId: string) {
  await Order.updateOne({ stripeSessionId: sessionId, status: "pending" }, { $set: { status: "expired" } });
}

export async function refundOrderByPaymentIntent(paymentIntentId: string) {
  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!order) return;
  order.status = "refunded";
  await order.save();
  await revokeEntitlementsForOrder(order);
}

/** Admin-initiated refund: issues the Stripe refund, then applies the same DB side effects directly. */
export async function refundOrder(orderId: Types.ObjectId | string) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
  if (order.status !== "paid") throw new AppError("Only paid orders can be refunded.", 400, "NOT_REFUNDABLE");
  if (!order.stripePaymentIntentId) {
    throw new AppError("This order has no payment on record.", 400, "NO_PAYMENT_INTENT");
  }

  await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
  order.status = "refunded";
  await order.save();
  await revokeEntitlementsForOrder(order);
  return order;
}
