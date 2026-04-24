const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      default: () => `P-${Date.now()}`,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      required: [true, "Unit of measurement is required"],
      // e.g., kg, piece, litre, meter, box, etc.
      trim: true,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: [0, "Minimum stock cannot be negative"],
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    image: {
      type: String, // Cloudinary URL
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: low stock alert
productSchema.virtual("isLowStock").get(function () {
  return this.currentStock <= this.minimumStock;
});

// Auto-generate product code if not provided
productSchema.pre("save", async function (next) {
  if (!this.code) {
    const count = await mongoose.model("Product").countDocuments();
    this.code = `PROD${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
