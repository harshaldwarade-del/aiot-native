const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: { type: String, required: true }, // snapshot at time of purchase
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
    min: [0, "Discount cannot be negative"],
  },
  netAmount: {
    type: Number,
    required: true,
  },
});

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      unique: true,
    },
    supplier: {
      name: { type: String, required: [true, "Supplier name is required"] },
      contact: { type: String },
      email: { type: String },
      address: { type: String },
      gstin: { type: String },
    },
    items: {
      type: [purchaseItemSchema],
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
    amountPaid: {
      type: Number,
      default: 0,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    invoiceDocument: {
      type: String, // Cloudinary URL
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "received", "cancelled"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
  },
);

// Auto-generate purchase number
purchaseSchema.pre("save", async function (next) {
  if (!this.purchaseNumber) {
    const count = await mongoose.model("Purchase").countDocuments();
    const year = new Date().getFullYear();
    this.purchaseNumber = `PUR-${year}-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

// Virtual: amount due
purchaseSchema.virtual("amountDue").get(function () {
  return this.grandTotal - this.amountPaid;
});

module.exports = mongoose.model("Purchase", purchaseSchema);
