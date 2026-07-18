import Mux from "@mux/mux-node";
import { env } from "./env";

export const mux = new Mux({
  tokenId: env.muxTokenId,
  tokenSecret: env.muxTokenSecret,
  jwtSigningKey: env.muxSigningKeyId,
  jwtPrivateKey: env.muxSigningKeyPrivate,
});
