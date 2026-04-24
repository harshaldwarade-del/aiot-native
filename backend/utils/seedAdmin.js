/**
 * Seed script — creates the initial super admin user.
 * Run once: node utils/seedAdmin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const seedAdmin = async () => {
  await connectDB();

  try {
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("⚠️  An admin user already exists:");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log("   Skipping seed.");
      process.exit(0);
    }

    const admin = await User.create({
      name: "Super Admin",
      email: "admin@allinonetechnology.com",
      password: "Admin@123",
      role: "admin",
      phone: "+91-0000000000",
      department: "Administration",
    });

    console.log("✅ Admin user created successfully!");
    console.log("─────────────────────────────────────");
    console.log(`   Name    : ${admin.name}`);
    console.log(`   Email   : ${admin.email}`);
    console.log(`   Password: Admin@123`);
    console.log(`   Role    : ${admin.role}`);
    console.log("─────────────────────────────────────");
    console.log("⚠️  Please change the password after first login.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();
