import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import Admin from "../models/Admin.js";

const mongoUri = process.env.MONGODB_URI;

const rl = readline.createInterface({ input: stdin, output: stdout });

async function createAdmin() {
  try {
    if (!mongoUri) {
  throw new Error("MONGODB_URI is missing from your .env file.");
}

    if (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET.includes("REPLACE_WITH")) {
      throw new Error("Set a strong JWT_SECRET in your .env file first.");
    }

    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Set a valid ADMIN_EMAIL in your .env file.");
    }

   await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
  autoSelectFamily: false,
});

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log("An admin with this email already exists. No changes made.");
      return;
    }

    const password = await rl.question(
      "Create an admin password (minimum 12 characters): ",
      { hideEchoBack: true }
    );

    if (password.length < 12) {
      throw new Error("Password must be at least 12 characters long.");
    }

    const confirmation = await rl.question(
      "Confirm your admin password: ",
      { hideEchoBack: true }
    );

    if (password !== confirmation) {
      throw new Error("Passwords do not match.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.create({
      email,
      password: passwordHash,
    });

    console.log(`Admin account created successfully for ${email}.`);
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();