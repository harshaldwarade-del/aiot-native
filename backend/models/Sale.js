const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: { type: String, required: true }, // snapshot at time of sale
  productCode: { type: String },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [0.01, "Quantity must be greater than 0"],
  },
  unit: { type: String, required: true },
  ratePerUnit: {
    type: Number,
    required: [true, "Rate per unit is required"],
    min: [0, "Rate cannot be negative"],
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    required: true,
  },
});

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      unique: true,
    },
    customer: {
      name: { type: String, required: [true, "Customer name is required"] },
      contact: { type: String },
      email: { type: String },
      address: { type: String },
      gstin: { type: String },
    },
    items: {
      type: [saleItemSchema],
      validate: [(arr) => arr.length > 0, "At least one item is required"],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    taxPercent: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "cheque", "upi", "credit", "other"],
      default: "cash",
    },
    amountReceived: {
      type: Number,
      default: 0,
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    invoiceDocument: {
      type: String, // Cloudinary URL
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "delivered", "cancelled", "returned"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
  },
);

// Auto-generate sale number
saleSchema.pre("save", async function (next) {
  if (!this.saleNumber) {
    const count = await mongoose.model("Sale").countDocuments();
    const year = new Date().getFullYear();
    this.saleNumber = `SAL-${year}-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

// Virtual: amount due
saleSchema.virtual("amountDue").get(function () {
  return this.grandTotal - this.amountReceived;
});

module.exports = mongoose.model("Sale", saleSchema);
