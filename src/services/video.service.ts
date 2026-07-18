import { mux } from "../config/mux";
import { ILecture, Lecture } from "../models/Lecture";
import { WebhookEvent } from "../models/WebhookEvent";

const PLAYBACK_TOKEN_TTL = "2h";

export type PlaybackPayload =
  | { provider: "youtube"; videoId: string }
  | { provider: "mux"; playbackId: string; token: string; expiresAt: string };

/**
 * Builds whatever the frontend player needs to actually play a lecture, once the
 * caller has already confirmed the viewer is allowed to see it. Never call this
 * before an access check — the Mux token this returns is a real, if short-lived,
 * credential for that playback ID.
 */
export async function buildPlaybackPayload(lecture: ILecture): Promise<PlaybackPayload> {
  if (lecture.videoProvider === "youtube") {
    return { provider: "youtube", videoId: lecture.videoRef };
  }

  // Mux: sign a short-lived JWT scoped to this one playback ID. The playback ID
  // itself is set on Mux to playback_policy "signed", so the ID alone is useless
  // without a valid token — links can't be shared past the token's expiry.
  const token = await mux.jwt.signPlaybackId(lecture.videoRef, {
    type: "video",
    expiration: PLAYBACK_TOKEN_TTL,
  });

  return {
    provider: "mux",
    playbackId: lecture.videoRef,
    token,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Same dedupe pattern as processStripeEvent (see payments.service.ts) — Mux retries
 * webhook deliveries too, and this must never re-run a handler for the same event.
 */
export async function processMuxEvent(eventId: string, type: string, handler: () => Promise<void>) {
  const alreadyProcessed = await WebhookEvent.exists({ provider: "mux", eventId });
  if (alreadyProcessed) return;

  await handler();
  await WebhookEvent.create({ provider: "mux", eventId, type });
}

/**
 * Fired when a Mux asset finishes encoding. `passthrough` carries the lecture ID we
 * set when creating the direct upload — this is what closes the loop so an instructor
 * never has to manually copy a playback ID out of the Mux dashboard.
 */
export async function attachReadyAssetToLecture(params: {
  passthrough: string | null | undefined;
  playbackId: string | undefined;
  durationSec: number | undefined;
}) {
  const { passthrough, playbackId, durationSec } = params;
  if (!passthrough || !playbackId) return; // Nothing to attach this asset to.

  await Lecture.updateOne(
    { _id: passthrough },
    {
      $set: {
        videoProvider: "mux",
        videoRef: playbackId,
        ...(durationSec ? { durationSec: Math.round(durationSec) } : {}),
      },
    }
  );
}
/**
 * Creates a Mux direct upload for a specific lecture. The lecture ID travels through
 * as Mux's `passthrough` field on the resulting asset, so the webhook handler can
 * attach the finished asset back to the right lecture without any extra bookkeeping.
 */
export async function createLectureUpload(lectureId: string, corsOrigin: string) {
  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policies: ["signed"],
      passthrough: lectureId,
    },
  });
  return { uploadId: upload.id, uploadUrl: upload.url };
}
