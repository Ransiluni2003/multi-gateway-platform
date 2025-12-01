// src/scripts/seedAdmin.ts
import dotenv from "dotenv";
import connectDB from "../config/db";
import User from "../models/User";
import bcrypt from "bcryptjs";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123"; // change in production

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log("Admin user already exists:", adminEmail);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(adminPassword, 10);
    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: hashed,
      role: "admin",
    });

    console.log("Admin user created:", admin.email);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error);
    process.exit(1);
  }
};

seedAdmin();
