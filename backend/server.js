require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// ── Connect to MongoDB ─────────────────────────────────────────────
connectDB();

const app = express();

// ── Core Middleware ────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Health Check ───────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AllInOne Technology API is running 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/purchases", require("./routes/purchases"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/admin", require("./routes/admin"));

// ── Error Handling ─────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log("─────────────────────────────────────────────────");
  console.log(`  🚀 AllInOne Technology API`);
  console.log(`  📡 Port      : ${PORT}`);
  console.log(`  🌍 Env       : ${process.env.NODE_ENV || "development"}`);
  console.log(`  🔗 URL       : http://localhost:${PORT}`);
  console.log("─────────────────────────────────────────────────");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
