import { Response } from "express";
import { Order } from "../models/Order";
import { Entitlement } from "../models/Entitlement";
import { User } from "../models/User";
import { Course } from "../models/Course";
import { TestAttempt } from "../models/TestAttempt";
import { catchAsync } from "../utils/catchAsync";
import { AuthedRequest } from "../middleware/auth";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const getAnalyticsSummary = catchAsync(async (_req: AuthedRequest, res: Response) => {
  const since30d = new Date(Date.now() - THIRTY_DAYS_MS);

  const [
    revenueTotal,
    revenue30d,
    enrollmentsTotal,
    enrollments30d,
    usersTotal,
    users30d,
    topCoursesRaw,
    examAttempts,
  ] = await Promise.all([
    Order.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, sum: { $sum: "$amountCents" } } }]),
    Order.aggregate([
      { $match: { status: "paid", createdAt: { $gte: since30d } } },
      { $group: { _id: null, sum: { $sum: "$amountCents" } } },
    ]),
    Entitlement.countDocuments(),
    Entitlement.countDocuments({ purchasedAt: { $gte: since30d } }),
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since30d } }),
    Entitlement.aggregate([
      { $group: { _id: "$courseId", enrollments: { $sum: 1 } } },
      { $sort: { enrollments: -1 } },
      { $limit: 5 },
      { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
      { $unwind: "$course" },
      { $project: { title: "$course.title", slug: "$course.slug", enrollments: 1 } },
    ]),
    TestAttempt.aggregate([
      { $match: { status: "submitted" } },
      {
        $lookup: { from: "tests", localField: "testId", foreignField: "_id", as: "test" },
      },
      { $unwind: "$test" },
      {
        $group: {
          _id: "$test.exam",
          attempts: { $sum: 1 },
          avgPct: { $avg: { $multiply: [{ $divide: ["$scoreCorrect", "$scoreTotal"] }, 100] } },
        },
      },
      { $project: { exam: "$_id", attempts: 1, avgPct: { $round: ["$avgPct", 1] }, _id: 0 } },
    ]),
  ]);

  const totalCourses = await Course.countDocuments();

  res.json({
    revenue: {
      totalCents: revenueTotal[0]?.sum || 0,
      last30dCents: revenue30d[0]?.sum || 0,
    },
    enrollments: { total: enrollmentsTotal, last30d: enrollments30d },
    users: { total: usersTotal, last30d: users30d },
    courses: { total: totalCourses },
    topCourses: topCoursesRaw,
    examStats: {
      totalAttempts: examAttempts.reduce((sum, e) => sum + e.attempts, 0),
      byExam: examAttempts,
    },
  });
});
