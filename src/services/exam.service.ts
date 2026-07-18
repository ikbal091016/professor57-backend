import { ITest } from "../models/Test";
import { IQuestion } from "../models/Question";
import { IAttemptAnswer, ISectionBreakdown, ITopicAccuracy } from "../models/TestAttempt";
import { hasEntitlement, canManageCourse } from "./access.service";
import { UserRole } from "../models/User";

/** Mirrors the free-preview logic from Phase 2's courses, applied to tests instead of lectures. */
export async function canAccessTest(
  user: { id: string; role: UserRole } | undefined,
  test: ITest
): Promise<boolean> {
  if (test.isFree) return true;
  if (!test.productCourseId) return false; // gated but nothing to buy — treat as staff-only until configured
  if (user?.role === "admin") return true;
  if (test.productCourseId && (await canManageCourse(user, test.productCourseId))) return true;
  if (!user) return false;
  return hasEntitlement(user.id, test.productCourseId);
}

/** Strips the answer key from a question — used everywhere except post-submission results. */
export function sanitizeQuestion(q: IQuestion) {
  return {
    id: q._id.toString(),
    section: q.section,
    difficulty: q.difficulty,
    type: q.type,
    stem: q.stem,
    choices: q.choices,
  };
}

function isAnswerCorrect(answer: IAttemptAnswer | undefined, question: IQuestion): boolean {
  if (!answer || answer.selectedChoiceIds.length === 0) return false;
  const selected = [...answer.selectedChoiceIds].sort();
  const correct = [...question.correctChoiceIds].sort();
  return selected.length === correct.length && selected.every((id, i) => id === correct[i]);
}

/**
 * Scores a full attempt against the answer key. Returns the raw score plus a
 * per-section and per-topic-tag breakdown — this is the whole basis of the
 * "score report" the architecture doc calls for.
 */
export function scoreAttempt(answers: IAttemptAnswer[], questions: IQuestion[]) {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId.toString(), a]));

  let correctCount = 0;
  const sectionMap = new Map<string, ISectionBreakdown>();
  const topicMap = new Map<string, ITopicAccuracy>();

  for (const question of questions) {
    const answer = answerByQuestion.get(question._id.toString());
    const correct = isAnswerCorrect(answer, question);
    if (correct) correctCount += 1;

    const section = sectionMap.get(question.section) || { section: question.section, correct: 0, total: 0 };
    section.total += 1;
    if (correct) section.correct += 1;
    sectionMap.set(question.section, section);

    for (const tag of question.tags) {
      const topic = topicMap.get(tag) || { tag, correct: 0, total: 0 };
      topic.total += 1;
      if (correct) topic.correct += 1;
      topicMap.set(tag, topic);
    }
  }

  return {
    scoreCorrect: correctCount,
    scoreTotal: questions.length,
    sectionBreakdown: Array.from(sectionMap.values()),
    topicAccuracy: Array.from(topicMap.values()),
  };
}
