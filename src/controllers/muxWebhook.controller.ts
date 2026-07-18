import { Request, Response } from "express";
import { mux } from "../config/mux";
import { env } from "../config/env";
import { processMuxEvent, attachReadyAssetToLecture } from "../services/video.service";

/** Mounted with express.raw() (see app.ts) — same reasoning as the Stripe webhook. */
export async function handleMuxWebhook(req: Request, res: Response) {
  const rawBody = (req.body as Buffer).toString("utf8");

  let event;
  try {
    event = await mux.webhooks.unwrap(rawBody, req.headers, env.muxWebhookSecret);
  } catch (err) {
    console.error("[mux webhook] signature verification failed:", err);
    return res.status(400).send("Webhook signature verification failed.");
  }

  try {
    await processMuxEvent(event.id, event.type, async () => {
      if (event.type === "video.asset.ready") {
        const asset = event.data as { id: string; passthrough?: string; duration?: number; playback_ids?: { id: string }[] };
        await attachReadyAssetToLecture({
          passthrough: asset.passthrough,
          playbackId: asset.playback_ids?.[0]?.id,
          durationSec: asset.duration,
        });
      }
      // Other event types (asset.errored, upload.errored, etc.) are safely ignored for now —
      // worth wiring to an admin notification once the catalog is large enough to need it.
    });

    res.json({ received: true });
  } catch (err) {
    console.error("[mux webhook] handler failed:", err);
    res.status(500).send("Webhook handler failed.");
  }
}
