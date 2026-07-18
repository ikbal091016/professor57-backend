import { connectDB } from "../config/db";
import { User } from "../models/User";
import mongoose from "mongoose";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@professor57.com";
  const newPassword = process.env.ADMIN_NEW_PASSWORD;
  if (!newPassword) {
    console.error("Set ADMIN_NEW_PASSWORD in Railway variables before running this.");
    process.exit(1);
  }

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  user.passwordHash = newPassword;
  await user.save();
  console.log(`Password updated for ${email}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
