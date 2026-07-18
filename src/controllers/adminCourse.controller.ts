import { Response } from "express";
import { Course } from "../models/Course";
import { Entitlement } from "../models/Entitlement";
import { catchAsync } from "../utils/catchAsync";
import { AuthedRequest } from "../middleware/auth";

/**
 * Lists courses for the admin/instructor management UI — unlike the public catalog
 * (Phase 2's listCourses), this includes unpublished drafts and, for an instructor,
 * only the courses they own. Admins see everything.
 */
export const listCoursesForManagement = catchAsync(async (req: AuthedRequest, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.user!.role === "instructor") filter.instructorId = req.user!.id;

  const courses = await Course.find(filter).sort({ createdAt: -1 }).lean();
  const enrollmentCounts = await Entitlement.aggregate([
    { $match: { courseId: { $in: courses.map((c) => c._id) } } },
    { $group: { _id: "$courseId", count: { $sum: 1 } } },
  ]);
  const countByCourse = new Map(enrollmentCounts.map((e) => [e._id.toString(), e.count]));

  res.json({
    courses: courses.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
      category: c.category,
      price: c.price,
      published: c.published,
      enrollments: countByCourse.get(c._id.toString()) || 0,
      createdAt: c.createdAt,
    })),
  });
});
