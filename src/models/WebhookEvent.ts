import { Schema, model, Document } from "mongoose";

/**
 * Records processed webhook event IDs (Stripe or Mux) so retried deliveries — both
 * providers retry aggressively on non-2xx or timeout — never re-run a handler that
 * grants/revokes entitlements or mutates a lecture a second time.
 */
export interface IWebhookEvent extends Document {
  provider: "stripe" | "mux";
  eventId: string;
  type: string;
  processedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>({
  provider: { type: String, enum: ["stripe", "mux"], required: true },
  eventId: { type: String, required: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: () => new Date() },
});

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const WebhookEvent = model<IWebhookEvent>("WebhookEvent", webhookEventSchema);
