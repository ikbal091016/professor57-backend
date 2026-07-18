import { Schema, model, Document, Types } from "mongoose";

export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number; // USD, e.g. 49.99. 0 = free course.
  thumbnailUrl?: string;
  instructorId: Types.ObjectId;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    thumbnailUrl: { type: String },
    instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    published: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

courseSchema.index({ title: "text", description: "text" });

export const Course = model<ICourse>("Course", courseSchema);
