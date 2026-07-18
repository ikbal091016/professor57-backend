import { Schema, model, Document, Types } from "mongoose";

export type OrderStatus = "pending" | "paid" | "refunded" | "expired" | "failed";

export interface IOrder extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseIds: Types.ObjectId[];
  amountCents: number;
  currency: string;
  status: OrderStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseIds: [{ type: Schema.Types.ObjectId, ref: "Course", required: true }],
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd" },
    status: {
      type: String,
      enum: ["pending", "paid", "refunded", "expired", "failed"],
      default: "pending",
      index: true,
    },
    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String, index: true },
    couponCode: { type: String },
  },
  { timestamps: true }
);

export const Order = model<IOrder>("Order", orderSchema);
