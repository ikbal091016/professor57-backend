import { Response } from "express";
import { Lecture } from "../models/Lecture";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { canManageCourse } from "../services/access.service";
import { createLectureUpload } from "../services/video.service";
import { env } from "../config/env";
import { AuthedRequest } from "../middleware/auth";

/**
 * Creates a Mux direct-upload URL for an existing lecture record. The instructor's
 * browser uploads the video file straight to Mux with this URL (see README) — the
 * Mux webhook then fills in the lecture's videoRef/duration once encoding finishes.
 */
export const createUploadForLecture = catchAsync(async (req: AuthedRequest, res: Response) => {
  const lecture = await Lecture.findById(req.params.lectureId);
  if (!lecture) throw new AppError("Lecture not found.", 404, "LECTURE_NOT_FOUND");

  const allowed = await canManageCourse(req.user, lecture.courseId);
  if (!allowed) throw new AppError("You don't have permission to manage this lecture.", 403, "FORBIDDEN");

  const { uploadId, uploadUrl } = await createLectureUpload(lecture._id.toString(), env.clientUrl);
  res.status(201).json({ uploadId, uploadUrl });
});
