import { Schema, model, Document, Types } from "mongoose";

export type AttemptStatus = "in_progress" | "submitted";

export interface IAttemptAnswer {
  questionId: Types.ObjectId;
  selectedChoiceIds: string[];
  flagged: boolean;
  timeSpentSec: number;
}

export interface ISectionBreakdown {
  section: string;
  correct: number;
  total: number;
}

export interface ITopicAccuracy {
  tag: string;
  correct: number;
  total: number;
}

export interface ITestAttempt extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  testId: Types.ObjectId;
  status: AttemptStatus;
  answers: IAttemptAnswer[];
  scoreCorrect?: number;
  scoreTotal?: number;
  sectionBreakdown?: ISectionBreakdown[];
  topicAccuracy?: ITopicAccuracy[];
  startedAt: Date;
  submittedAt?: Date;
}

const attemptAnswerSchema = new Schema<IAttemptAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    selectedChoiceIds: { type: [String], default: [] },
    flagged: { type: Boolean, default: false },
    timeSpentSec: { type: Number, default: 0 },
  },
  { _id: false }
);

const testAttemptSchema = new Schema<ITestAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
  status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress" },
  answers: { type: [attemptAnswerSchema], default: [] },
  scoreCorrect: { type: Number },
  scoreTotal: { type: Number },
  sectionBreakdown: {
    type: [{ section: String, correct: Number, total: Number }],
    default: undefined,
  },
  topicAccuracy: {
    type: [{ tag: String, correct: Number, total: Number }],
    default: undefined,
  },
  startedAt: { type: Date, default: () => new Date() },
  submittedAt: { type: Date },
});

testAttemptSchema.index({ userId: 1, testId: 1, status: 1 });

export const TestAttempt = model<ITestAttempt>("TestAttempt", testAttemptSchema);
