import { Response } from "express";
import { Lecture } from "../models/Lecture";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { hasEntitlement, canManageCourse } from "../services/access.service";
import { buildPlaybackPayload } from "../services/video.service";
import { AuthedRequest } from "../middleware/auth";

/**
 * The actual video-delivery endpoint. Course detail (Phase 2) only ever tells the
 * client whether a lecture is locked and which provider it uses — the real video
 * reference (and, for Mux, a signed token) is only ever minted here, after checking
 * access fresh on every call. optionalAuthenticate on this route means a logged-out
 * visitor can still hit it for a free lecture.
 */
export const getLecturePlayback = catchAsync(async (req: AuthedRequest, res: Response) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) throw new AppError("Lecture not found.", 404, "LECTURE_NOT_FOUND");

  if (!lecture.isFree) {
    const entitled = req.user ? await hasEntitlement(req.user.id, lecture.courseId) : false;
    const manageable = await canManageCourse(req.user, lecture.courseId);
    if (!entitled && !manageable) {
      throw new AppError("This lecture unlocks with purchase.", 403, "LOCKED_LECTURE");
    }
  }

  const payload = await buildPlaybackPayload(lecture);
  res.json(payload);
});
