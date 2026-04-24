/**
 * Seeds demo products, users, purchases, and sales for development.
 * Run: node utils/seedDemo.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const Sale = require("../models/Sale");
const connectDB = require("../config/db");

const seedDemo = async () => {
  await connectDB();

  try {
    // ── Users ──────────────────────────────────────────────────────
    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
      admin = await User.create({
        name: "Super Admin",
        email: "admin@allinonetechnology.com",
        password: "Admin@123",
        role: "admin",
        department: "Administration",
      });
      console.log("✅ Admin created");
    }

    const salesUser = await User.findOneAndUpdate(
      { email: "sales@allinonetechnology.com" },
      {
        name: "Rahul Sharma",
        email: "sales@allinonetechnology.com",
        password: "Sales@123",
        role: "sales",
        department: "Sales",
        phone: "+91-9876543210",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log("✅ Sales user ready");

    const purchaseUser = await User.findOneAndUpdate(
      { email: "purchase@allinonetechnology.com" },
      {
        name: "Priya Mehta",
        email: "purchase@allinonetechnology.com",
        password: "Purchase@123",
        role: "purchase",
        department: "Purchase",
        phone: "+91-9123456789",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log("✅ Purchase user ready");

    // ── Products ───────────────────────────────────────────────────
    const productData = [
      {
        name: "Copper Wire 1mm",
        category: "Electrical",
        unit: "meter",
        currentStock: 500,
        minimumStock: 50,
        sellingPrice: 35,
        purchasePrice: 22,
      },
      {
        name: "PVC Conduit Pipe",
        category: "Plumbing",
        unit: "piece",
        currentStock: 200,
        minimumStock: 20,
        sellingPrice: 120,
        purchasePrice: 80,
      },
      {
        name: "MCB 32A",
        category: "Electrical",
        unit: "piece",
        currentStock: 80,
        minimumStock: 10,
        sellingPrice: 450,
        purchasePrice: 300,
      },
      {
        name: "CCTV Camera 2MP",
        category: "Security",
        unit: "piece",
        currentStock: 15,
        minimumStock: 5,
        sellingPrice: 2200,
        purchasePrice: 1400,
      },
      {
        name: "Network Cable CAT6",
        category: "Networking",
        unit: "meter",
        currentStock: 1000,
        minimumStock: 100,
        sellingPrice: 18,
        purchasePrice: 10,
      },
      {
        name: "LED Bulb 9W",
        category: "Lighting",
        unit: "piece",
        currentStock: 8,
        minimumStock: 20,
        sellingPrice: 85,
        purchasePrice: 55,
      }, // Low stock
      {
        name: "Distribution Board 8-way",
        category: "Electrical",
        unit: "piece",
        currentStock: 25,
        minimumStock: 5,
        sellingPrice: 780,
        purchasePrice: 500,
      },
      {
        name: "RJ45 Connector",
        category: "Networking",
        unit: "piece",
        currentStock: 500,
        minimumStock: 100,
        sellingPrice: 8,
        purchasePrice: 4,
      },
    ];

    const products = [];
    for (const p of productData) {
      const existing = await Product.findOneAndUpdate(
        { name: p.name },
        { ...p, createdBy: admin._id },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      products.push(existing);
    }
    console.log(`✅ ${products.length} products ready`);

    // ── Purchases ──────────────────────────────────────────────────
    const existingPurchases = await Purchase.countDocuments();
    if (existingPurchases === 0) {
      const purchasesData = [
        {
          supplier: {
            name: "Havells Distributors",
            contact: "9000000001",
            email: "supply@havells.com",
            address: "Mumbai, MH",
          },
          items: [
            {
              product: products[0]._id,
              productName: products[0].name,
              productCode: products[0].code,
              quantity: 1000,
              unit: "meter",
              ratePerUnit: 22,
              totalAmount: 22000,
              discount: 0,
              netAmount: 22000,
            },
            {
              product: products[4]._id,
              productName: products[4].name,
              productCode: products[4].code,
              quantity: 500,
              unit: "meter",
              ratePerUnit: 10,
              totalAmount: 5000,
              discount: 0,
              netAmount: 5000,
            },
          ],
          subtotal: 27000,
          taxPercent: 18,
          taxAmount: 4860,
          discountAmount: 0,
          grandTotal: 31860,
          paymentStatus: "paid",
          amountPaid: 31860,
          paymentMethod: "bank_transfer",
          purchasedBy: purchaseUser._id,
          purchaseDate: new Date(Date.now() - 10 * 86400000),
        },
        {
          supplier: {
            name: "Syska Tech",
            contact: "9000000002",
            address: "Pune, MH",
          },
          items: [
            {
              product: products[5]._id,
              productName: products[5].name,
              productCode: products[5].code,
              quantity: 100,
              unit: "piece",
              ratePerUnit: 55,
              totalAmount: 5500,
              discount: 500,
              netAmount: 5000,
            },
          ],
          subtotal: 5000,
          taxPercent: 18,
          taxAmount: 900,
          discountAmount: 0,
          grandTotal: 5900,
          paymentStatus: "partial",
          amountPaid: 3000,
          paymentMethod: "upi",
          purchasedBy: purchaseUser._id,
          purchaseDate: new Date(Date.now() - 5 * 86400000),
        },
        {
          supplier: {
            name: "CP Plus Security",
            contact: "9000000003",
            email: "orders@cpplus.com",
          },
          items: [
            {
              product: products[3]._id,
              productName: products[3].name,
              productCode: products[3].code,
              quantity: 20,
              unit: "piece",
              ratePerUnit: 1400,
              totalAmount: 28000,
              discount: 2000,
              netAmount: 26000,
            },
          ],
          subtotal: 26000,
          taxPercent: 18,
          taxAmount: 4680,
          discountAmount: 0,
          grandTotal: 30680,
          paymentStatus: "pending",
          amountPaid: 0,
          paymentMethod: "credit",
          purchasedBy: admin._id,
          purchaseDate: new Date(Date.now() - 2 * 86400000),
        },
      ];

      for (const p of purchasesData) {
        await Purchase.create(p);
      }
      console.log(`✅ ${purchasesData.length} purchases created`);
    } else {
      console.log("⏭️  Purchases already exist, skipping");
    }

    // ── Sales ──────────────────────────────────────────────────────
    const existingSales = await Sale.countDocuments();
    if (existingSales === 0) {
      const salesData = [
        {
          customer: {
            name: "Ravi Constructions",
            contact: "9111111111",
            email: "ravi@constructions.com",
            address: "Nashik, MH",
          },
          items: [
            {
              product: products[0]._id,
              productName: products[0].name,
              productCode: products[0].code,
              quantity: 200,
              unit: "meter",
              ratePerUnit: 35,
              totalAmount: 7000,
              discount: 0,
              netAmount: 7000,
            },
            {
              product: products[6]._id,
              productName: products[6].name,
              productCode: products[6].code,
              quantity: 5,
              unit: "piece",
              ratePerUnit: 780,
              totalAmount: 3900,
              discount: 0,
              netAmount: 3900,
            },
          ],
          subtotal: 10900,
          taxPercent: 18,
          taxAmount: 1962,
          discountAmount: 0,
          grandTotal: 12862,
          paymentStatus: "paid",
          amountReceived: 12862,
          paymentMethod: "bank_transfer",
          soldBy: salesUser._id,
          saleDate: new Date(Date.now() - 8 * 86400000),
        },
        {
          customer: {
            name: "SmartHome Solutions",
            contact: "9222222222",
            address: "Pune, MH",
          },
          items: [
            {
              product: products[3]._id,
              productName: products[3].name,
              productCode: products[3].code,
              quantity: 4,
              unit: "piece",
              ratePerUnit: 2200,
              totalAmount: 8800,
              discount: 0,
              netAmount: 8800,
            },
            {
              product: products[7]._id,
              productName: products[7].name,
              productCode: products[7].code,
              quantity: 50,
              unit: "piece",
              ratePerUnit: 8,
              totalAmount: 400,
              discount: 0,
              netAmount: 400,
            },
          ],
          subtotal: 9200,
          taxPercent: 18,
          taxAmount: 1656,
          discountAmount: 200,
          grandTotal: 10656,
          paymentStatus: "partial",
          amountReceived: 5000,
          paymentMethod: "upi",
          soldBy: salesUser._id,
          saleDate: new Date(Date.now() - 3 * 86400000),
        },
        {
          customer: { name: "GreenField Builders", contact: "9333333333" },
          items: [
            {
              product: products[2]._id,
              productName: products[2].name,
              productCode: products[2].code,
              quantity: 10,
              unit: "piece",
              ratePerUnit: 450,
              totalAmount: 4500,
              discount: 0,
              netAmount: 4500,
            },
          ],
          subtotal: 4500,
          taxPercent: 18,
          taxAmount: 810,
          discountAmount: 0,
          grandTotal: 5310,
          paymentStatus: "pending",
          amountReceived: 0,
          paymentMethod: "credit",
          soldBy: admin._id,
          saleDate: new Date(Date.now() - 1 * 86400000),
        },
      ];

      for (const s of salesData) {
        await Sale.create(s);
      }
      console.log(`✅ ${salesData.length} sales created`);
    } else {
      console.log("⏭️  Sales already exist, skipping");
    }

    console.log("\n🎉 Demo data seeded successfully!");
    console.log("─────────────────────────────────────────");
    console.log("  Admin    → admin@allinonetechnology.com / Admin@123");
    console.log("  Sales    → sales@allinonetechnology.com / Sales@123");
    console.log("  Purchase → purchase@allinonetechnology.com / Purchase@123");
    console.log("─────────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
};

seedDemo();
