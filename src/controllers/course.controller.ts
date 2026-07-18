import { Response } from "express";
import { Types } from "mongoose";
import { Course } from "../models/Course";
import { Section } from "../models/Section";
import { Lecture, ILecture } from "../models/Lecture";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { slugify } from "../utils/slugify";
import { hasEntitlement, canManageCourse } from "../services/access.service";
import { AuthedRequest } from "../middleware/auth";

// ---------- helpers ----------

async function uniqueSlugFor(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let suffix = 1;
  // Extremely unlikely to loop more than once or twice in practice.
  while (await Course.exists({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

function serializeLecture(lecture: ILecture, locked: boolean) {
  const base = {
    id: lecture._id.toString(),
    title: lecture.title,
    durationSec: lecture.durationSec,
    order: lecture.order,
    isFree: lecture.isFree,
    locked,
  };
  if (locked) return base;
  // Note: no videoRef here even when unlocked — the frontend calls
  // GET /api/lectures/:id/playback to get a playable reference, which re-checks
  // access on every call and, for Mux, mints a fresh short-lived signed token.
  return {
    ...base,
    videoProvider: lecture.videoProvider,
    resources: lecture.resources,
  };
}

async function requireManageableCourse(req: AuthedRequest, courseId: string) {
  if (!Types.ObjectId.isValid(courseId)) throw new AppError("Course not found.", 404, "COURSE_NOT_FOUND");
  const course = await Course.findById(courseId);
  if (!course) throw new AppError("Course not found.", 404, "COURSE_NOT_FOUND");
  const allowed = await canManageCourse(req.user, course._id);
  if (!allowed) throw new AppError("You don't have permission to manage this course.", 403, "FORBIDDEN");
  return course;
}

// ---------- public ----------

export const listCourses = catchAsync(async (req: AuthedRequest, res: Response) => {
  const { category, search, page = 1, limit = 20 } = req.query as {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  };

  const filter: Record<string, unknown> = { published: true };
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .select("title slug description category price thumbnailUrl createdAt")
      .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  res.json({ courses, page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const getCourseBySlug = catchAsync(async (req: AuthedRequest, res: Response) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) throw new AppError("Course not found.", 404, "COURSE_NOT_FOUND");

  const [sections, lectures, entitled, canManage] = await Promise.all([
    Section.find({ courseId: course._id }).sort({ order: 1 }).lean(),
    Lecture.find({ courseId: course._id }).sort({ order: 1 }),
    req.user ? hasEntitlement(req.user.id, course._id) : Promise.resolve(false),
    canManageCourse(req.user, course._id),
  ]);

  const fullAccess = entitled || canManage;
  const lecturesBySection = new Map<string, ReturnType<typeof serializeLecture>[]>();
  for (const lecture of lectures) {
    const locked = !fullAccess && !lecture.isFree;
    const key = lecture.sectionId.toString();
    if (!lecturesBySection.has(key)) lecturesBySection.set(key, []);
    lecturesBySection.get(key)!.push(serializeLecture(lecture, locked));
  }

  res.json({
    course: {
      id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category,
      price: course.price,
      thumbnailUrl: course.thumbnailUrl,
    },
    hasAccess: fullAccess,
    sections: sections.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      order: s.order,
      lectures: lecturesBySection.get(s._id.toString()) || [],
    })),
  });
});

// ---------- admin / instructor: courses ----------

export const createCourse = catchAsync(async (req: AuthedRequest, res: Response) => {
  const slug = await uniqueSlugFor(req.body.title);
  const course = await Course.create({ ...req.body, slug, instructorId: req.user!.id });
  res.status(201).json({ course });
});

export const updateCourse = catchAsync(async (req: AuthedRequest, res: Response) => {
  const course = await requireManageableCourse(req, req.params.id);
  Object.assign(course, req.body);
  await course.save();
  res.json({ course });
});

export const deleteCourse = catchAsync(async (req: AuthedRequest, res: Response) => {
  const course = await requireManageableCourse(req, req.params.id);
  await Promise.all([
    Lecture.deleteMany({ courseId: course._id }),
    Section.deleteMany({ courseId: course._id }),
    course.deleteOne(),
  ]);
  res.status(204).send();
});

/** Lists a course's own draft + published content for the instructor/admin editor view. */
export const getCourseForEditing = catchAsync(async (req: AuthedRequest, res: Response) => {
  const course = await requireManageableCourse(req, req.params.id);
  const [sections, lectures] = await Promise.all([
    Section.find({ courseId: course._id }).sort({ order: 1 }).lean(),
    Lecture.find({ courseId: course._id }).sort({ order: 1 }).lean(),
  ]);
  res.json({ course, sections, lectures });
});

// ---------- admin / instructor: sections ----------

export const createSection = catchAsync(async (req: AuthedRequest, res: Response) => {
  const course = await requireManageableCourse(req, req.params.courseId);
  const count = await Section.countDocuments({ courseId: course._id });
  const section = await Section.create({
    courseId: course._id,
    title: req.body.title,
    order: req.body.order ?? count,
  });
  res.status(201).json({ section });
});

export const updateSection = catchAsync(async (req: AuthedRequest, res: Response) => {
  const section = await Section.findById(req.params.id);
  if (!section) throw new AppError("Section not found.", 404, "SECTION_NOT_FOUND");
  await requireManageableCourse(req, section.courseId.toString());
  Object.assign(section, req.body);
  await section.save();
  res.json({ section });
});

export const deleteSection = catchAsync(async (req: AuthedRequest, res: Response) => {
  const section = await Section.findById(req.params.id);
  if (!section) throw new AppError("Section not found.", 404, "SECTION_NOT_FOUND");
  await requireManageableCourse(req, section.courseId.toString());
  await Promise.all([Lecture.deleteMany({ sectionId: section._id }), section.deleteOne()]);
  res.status(204).send();
});

export const reorderSections = catchAsync(async (req: AuthedRequest, res: Response) => {
  const course = await requireManageableCourse(req, req.params.courseId);
  const { orderedIds } = req.body as { orderedIds: string[] };
  await Promise.all(
    orderedIds.map((id, index) =>
      Section.updateOne({ _id: id, courseId: course._id }, { $set: { order: index } })
    )
  );
  res.json({ message: "Sections reordered." });
});

// ---------- admin / instructor: lectures ----------

export const createLecture = catchAsync(async (req: AuthedRequest, res: Response) => {
  const section = await Section.findById(req.params.sectionId);
  if (!section) throw new AppError("Section not found.", 404, "SECTION_NOT_FOUND");
  await requireManageableCourse(req, section.courseId.toString());

  const count = await Lecture.countDocuments({ sectionId: section._id });
  const lecture = await Lecture.create({
    ...req.body,
    sectionId: section._id,
    courseId: section.courseId,
    order: req.body.order ?? count,
  });
  res.status(201).json({ lecture });
});

export const updateLecture = catchAsync(async (req: AuthedRequest, res: Response) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) throw new AppError("Lecture not found.", 404, "LECTURE_NOT_FOUND");
  await requireManageableCourse(req, lecture.courseId.toString());
  Object.assign(lecture, req.body);
  await lecture.save();
  res.json({ lecture });
});

export const deleteLecture = catchAsync(async (req: AuthedRequest, res: Response) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) throw new AppError("Lecture not found.", 404, "LECTURE_NOT_FOUND");
  await requireManageableCourse(req, lecture.courseId.toString());
  await lecture.deleteOne();
  res.status(204).send();
});

export const reorderLectures = catchAsync(async (req: AuthedRequest, res: Response) => {
  const section = await Section.findById(req.params.sectionId);
  if (!section) throw new AppError("Section not found.", 404, "SECTION_NOT_FOUND");
  await requireManageableCourse(req, section.courseId.toString());

  const { orderedIds } = req.body as { orderedIds: string[] };
  await Promise.all(
    orderedIds.map((id, index) =>
      Lecture.updateOne({ _id: id, sectionId: section._id }, { $set: { order: index } })
    )
  );
  res.json({ message: "Lectures reordered." });
});
