import { Schema, model, Document, Types } from "mongoose";

export type VideoProvider = "youtube" | "mux";

export interface ILectureResource {
  title: string;
  url: string;
}

export interface ILecture extends Document {
  _id: Types.ObjectId;
  courseId: Types.ObjectId; // denormalized for fast "is this lecture in course X" checks
  sectionId: Types.ObjectId;
  title: string;
  videoProvider: VideoProvider;
  videoRef: string; // YouTube video ID, or Mux asset/playback ID
  durationSec: number;
  order: number;
  /** First N lectures per course are typically flagged free — enforced by the instructor/admin, not auto-computed. */
  isFree: boolean;
  resources: ILectureResource[];
  createdAt: Date;
  updatedAt: Date;
}

const lectureSchema = new Schema<ILecture>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    videoProvider: { type: String, enum: ["youtube", "mux"], required: true },
    videoRef: { type: String, required: true },
    durationSec: { type: Number, required: true, min: 0 },
    order: { type: Number, required: true, default: 0 },
    isFree: { type: Boolean, default: false, index: true },
    resources: {
      type: [{ title: String, url: String }],
      default: [],
    },
  },
  { timestamps: true }
);

lectureSchema.index({ sectionId: 1, order: 1 });

export const Lecture = model<ILecture>("Lecture", lectureSchema);
