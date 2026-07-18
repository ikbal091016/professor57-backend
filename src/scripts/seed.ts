/**
 * Creates a demo admin user and a published sample course so Phase 2's endpoints
 * are testable immediately. Run with: npm run seed
 */
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { Course } from "../models/Course";
import { Section } from "../models/Section";
import { Lecture } from "../models/Lecture";
import { Question } from "../models/Question";
import { Test } from "../models/Test";
import { slugify } from "../utils/slugify";
import mongoose from "mongoose";

async function main() {
  await connectDB();

  let admin = await User.findOne({ email: "admin@professor57.com" });
  if (!admin) {
    admin = await User.create({
      name: "Professor57 Admin",
      email: "admin@professor57.com",
      passwordHash: "Password123", // hashed by the User pre-save hook
      role: "admin",
      isEmailVerified: true,
    });
    console.log("Created admin user: admin@professor57.com / Password123");
  }

  const title = "GRE Verbal Reasoning Foundations";
  const slug = slugify(title);
  let course = await Course.findOne({ slug });
  if (!course) {
    course = await Course.create({
      title,
      slug,
      description:
        "A complete walkthrough of GRE verbal reasoning: reading comprehension, text completion, and sentence equivalence, with strategy for each question type.",
      category: "Test Prep",
      price: 49,
      instructorId: admin._id,
      published: true,
    });

    const section = await Section.create({ courseId: course._id, title: "Getting started", order: 0 });

    await Lecture.create([
      {
        courseId: course._id,
        sectionId: section._id,
        title: "Course overview and how to study",
        videoProvider: "youtube",
        videoRef: "dQw4w9WgXcQ",
        durationSec: 420,
        order: 0,
        isFree: true,
      },
      {
        courseId: course._id,
        sectionId: section._id,
        title: "Reading comprehension: the basics",
        videoProvider: "youtube",
        videoRef: "dQw4w9WgXcQ",
        durationSec: 900,
        order: 1,
        isFree: true,
      },
      {
        courseId: course._id,
        sectionId: section._id,
        title: "Text completion strategy",
        videoProvider: "youtube",
        videoRef: "dQw4w9WgXcQ",
        durationSec: 780,
        order: 2,
        isFree: false,
      },
    ]);

    console.log(`Created sample course: /courses/${slug}`);
  }

  // ---- Phase 5: exam prep sample data ----
  const bankTitle = "GRE Full Question Bank Access";
  const bankSlug = slugify(bankTitle);
  let bankCourse = await Course.findOne({ slug: bankSlug });
  if (!bankCourse) {
    bankCourse = await Course.create({
      title: bankTitle,
      slug: bankSlug,
      description:
        "Lifetime access to the complete GRE question bank: every timed section drill and full mock exam.",
      category: "Test Prep",
      price: 29,
      instructorId: admin._id,
      published: true,
    });
    console.log(`Created test-prep product: /courses/${bankSlug}`);
  }

  const existingQuestions = await Question.countDocuments({ exam: "GRE" });
  if (existingQuestions === 0) {
    const created = await Question.insertMany([
      {
        exam: "GRE",
        section: "Verbal",
        difficulty: "easy",
        type: "single",
        stem: 'Choose the word that best completes the sentence: "Despite her ___ demeanor, she was known for making bold decisions under pressure."',
        choices: [
          { id: "a", text: "timid" },
          { id: "b", text: "gregarious" },
          { id: "c", text: "placid" },
          { id: "d", text: "erratic" },
        ],
        correctChoiceIds: ["c"],
        explanation: '"Placid" (calm, composed) fits the contrast with "bold decisions under pressure" — the sentence sets up a contrast between outward calm and inner decisiveness.',
        tags: ["text-completion", "vocabulary"],
      },
      {
        exam: "GRE",
        section: "Verbal",
        difficulty: "medium",
        type: "single",
        stem: 'The scientist\'s findings were considered ___ because they contradicted decades of established research without offering conclusive evidence.',
        choices: [
          { id: "a", text: "orthodox" },
          { id: "b", text: "controversial" },
          { id: "c", text: "definitive" },
          { id: "d", text: "redundant" },
        ],
        correctChoiceIds: ["b"],
        explanation: '"Controversial" fits — contradicting established research without conclusive proof is the definition of a controversial claim, not an orthodox, definitive, or redundant one.',
        tags: ["text-completion", "vocabulary"],
      },
      {
        exam: "GRE",
        section: "Quant",
        difficulty: "easy",
        type: "single",
        stem: "If 3x + 7 = 22, what is the value of x?",
        choices: [
          { id: "a", text: "3" },
          { id: "b", text: "5" },
          { id: "c", text: "7" },
          { id: "d", text: "15" },
        ],
        correctChoiceIds: ["b"],
        explanation: "3x + 7 = 22 → 3x = 15 → x = 5.",
        tags: ["algebra"],
      },
    ]);
    console.log(`Created ${created.length} sample GRE questions.`);
  }

  const greQuestions = await Question.find({ exam: "GRE" }).sort({ createdAt: 1 }).lean();

  const sampleTestTitle = "GRE Verbal — Free Sample Set";
  if (!(await Test.findOne({ title: sampleTestTitle }))) {
    await Test.create({
      title: sampleTestTitle,
      exam: "GRE",
      type: "practice",
      section: "Verbal",
      questionIds: greQuestions.filter((q) => q.section === "Verbal").map((q) => q._id),
      isFree: true,
      published: true,
    });
    console.log("Created free sample test: GRE Verbal — Free Sample Set");
  }

  const mockTestTitle = "GRE Full-Length Mock Exam 1";
  if (!(await Test.findOne({ title: mockTestTitle }))) {
    await Test.create({
      title: mockTestTitle,
      exam: "GRE",
      type: "mock",
      questionIds: greQuestions.map((q) => q._id),
      timeLimitSec: 3600,
      isFree: false,
      productCourseId: bankCourse._id,
      published: true,
    });
    console.log("Created gated test: GRE Full-Length Mock Exam 1 (requires the test-prep product)");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
