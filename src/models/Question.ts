import { Schema, model, Document, Types } from "mongoose";

export type QuestionType = "single" | "multi";
export type Difficulty = "easy" | "medium" | "hard";

export interface IQuestionChoice {
  id: string; // short stable id within the question, e.g. "a" / "b" / "c" / "d"
  text: string;
}

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  exam: string; // e.g. "GRE", "GMAT" — free text so new exams don't need a migration
  section: string; // e.g. "Verbal", "Quant", "AWA"
  difficulty: Difficulty;
  type: QuestionType;
  stem: string;
  choices: IQuestionChoice[];
  correctChoiceIds: string[]; // length 1 for "single", 1+ for "multi"
  explanation: string;
  tags: string[]; // topic tags, drive per-topic accuracy in results
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    exam: { type: String, required: true, trim: true, index: true },
    section: { type: String, required: true, trim: true, index: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    type: { type: String, enum: ["single", "multi"], default: "single" },
    stem: { type: String, required: true, maxlength: 4000 },
    choices: {
      type: [{ id: { type: String, required: true }, text: { type: String, required: true } }],
      validate: {
        validator: (v: IQuestionChoice[]) => v.length >= 2 && v.length <= 8,
        message: "A question needs between 2 and 8 answer choices.",
      },
    },
    correctChoiceIds: {
      type: [String],
      validate: { validator: (v: string[]) => v.length >= 1, message: "At least one correct choice is required." },
    },
    explanation: { type: String, required: true, maxlength: 4000 },
    tags: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

questionSchema.index({ exam: 1, section: 1, difficulty: 1 });

export const Question = model<IQuestion>("Question", questionSchema);
