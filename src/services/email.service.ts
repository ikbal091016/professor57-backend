import { Resend } from "resend";
import { env } from "../config/env";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`);
    return;
  }
  await resend.emails.send({ from: env.emailFrom, to, subject, html });
}

export async function sendVerificationEmail(to: string, name: string, rawToken: string) {
  const link = `${env.clientUrl}/verify-email?token=${rawToken}`;
  await send(
    to,
    "Verify your Professor57 account",
    `<p>Hi ${name},</p><p>Confirm your email to activate your Professor57 account:</p>
     <p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`
  );
}

export async function sendPasswordResetEmail(to: string, name: string, rawToken: string) {
  const link = `${env.clientUrl}/reset-password?token=${rawToken}`;
  await send(
    to,
    "Reset your Professor57 password",
    `<p>Hi ${name},</p><p>Use the link below to reset your password. If you didn't request this, ignore this email.</p>
     <p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`
  );
}

export async function sendWelcomeEmail(to: string, name: string) {
  await send(
    to,
    "Welcome to Professor57",
    `<p>Hi ${name},</p><p>Your account is verified — welcome to Professor57. Browse courses and start with any free preview lecture, no purchase needed.</p>`
  );
}
