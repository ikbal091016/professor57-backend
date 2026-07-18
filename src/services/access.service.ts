import { Types } from "mongoose";
import { Entitlement } from "../models/Entitlement";
import { Course } from "../models/Course";
import { UserRole } from "../models/User";

/** True if the user owns a lifetime entitlement for the course. */
export async function hasEntitlement(userId: string, courseId: Types.ObjectId): Promise<boolean> {
  const entitlement = await Entitlement.findOne({ userId, courseId }).lean();
  return !!entitlement;
}

/**
 * True if the user can see every locked lecture in a course regardless of purchase —
 * platform admins, or the instructor who owns the course.
 */
export async function canManageCourse(
  user: { id: string; role: UserRole } | undefined,
  courseId: Types.ObjectId
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "instructor") return false;
  const course = await Course.findById(courseId).select("instructorId").lean();
  return !!course && course.instructorId.toString() === user.id;
}
