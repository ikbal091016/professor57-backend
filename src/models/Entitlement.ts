import { Schema, model, Document, Types } from "mongoose";

/**
 * Records that a user has permanent ("lifetime") access to a course.
 * Created by the payment webhook in Phase 3. Course-access checks in this
 * phase read from this collection; nothing here creates entitlements yet.
 */
export interface IEntitlement extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  purchasedAt: Date;
  source: "stripe" | "manual";
  lifetime: boolean;
}

const entitlementSchema = new Schema<IEntitlement>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  purchasedAt: { type: Date, default: () => new Date() },
  source: { type: String, enum: ["stripe", "manual"], default: "manual" },
  lifetime: { type: Boolean, default: true },
});

entitlementSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Entitlement = model<IEntitlement>("Entitlement", entitlementSchema);
