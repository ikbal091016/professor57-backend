import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  mongoUri: required("MONGO_URI"),

  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "Professor57 <no-reply@professor57.com>",

  stripeSecretKey: required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: required("STRIPE_WEBHOOK_SECRET"),

  muxTokenId: required("MUX_TOKEN_ID"),
  muxTokenSecret: required("MUX_TOKEN_SECRET"),
  muxSigningKeyId: required("MUX_SIGNING_KEY_ID"),
  muxSigningKeyPrivate: required("MUX_SIGNING_KEY_PRIVATE"), // base64, as issued by Mux
  muxWebhookSecret: required("MUX_WEBHOOK_SECRET"),

  cookieDomain: process.env.COOKIE_DOMAIN || "localhost",
  isProd: process.env.NODE_ENV === "production",
};
