import { Schema, model, Document, Types } from "mongoose";

export type TestType = "practice" | "timed_section" | "mock";

export interface ITest extends Document {
  _id: Types.ObjectId;
  title: string;
  exam: string;
  type: TestType;
  section?: string; // set for a "timed_section" drill (e.g. just "Quant"); omitted for a full mock
  questionIds: Types.ObjectId[]; // ordered — this order is the test's question order
  timeLimitSec?: number; // omitted/untimed for "practice"
  /** A handful of free sample tests per exam; everything else gates behind productCourseId. */
  isFree: boolean;
  /**
   * The Course whose entitlement unlocks this test — reuses Phase 2/3's course +
   * entitlement machinery rather than inventing a parallel product/purchase model.
   * A "GRE Full Question Bank" product is just a Course row with category "Test Prep".
   */
  productCourseId?: Types.ObjectId;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const testSchema = new Schema<ITest>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    exam: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ["practice", "timed_section", "mock"], required: true },
    section: { type: String, trim: true },
    questionIds: [{ type: Schema.Types.ObjectId, ref: "Question", required: true }],
    timeLimitSec: { type: Number, min: 0 },
    isFree: { type: Boolean, default: false },
    productCourseId: { type: Schema.Types.ObjectId, ref: "Course" },
    published: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Test = model<ITest>("Test", testSchema);
