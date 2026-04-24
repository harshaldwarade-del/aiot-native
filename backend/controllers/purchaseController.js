const Purchase = require("../models/Purchase");
const Product = require("../models/Product");

// Helper: update stock on purchase
const updateStockOnPurchase = async (items, operation = "add") => {
  for (const item of items) {
    const delta = operation === "add" ? item.quantity : -item.quantity;
    await Product.findByIdAndUpdate(item.product, {
      $inc: { currentStock: delta },
    });
  }
};

// @desc    Create a new purchase
// @route   POST /api/purchases
// @access  Private (Admin, Purchase, Manager)
const createPurchase = async (req, res, next) => {
  try {
    const {
      items,
      supplier,
      taxPercent,
      discountAmount,
      paymentMethod,
      amountPaid,
      purchaseDate,
      invoiceNumber,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one item is required." });
    }

    // Validate products exist and enrich item data
    const enrichedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            message: `Product ${item.product} not found.`,
          });
      }

      const totalAmount = item.quantity * item.ratePerUnit;
      const itemDiscount = item.discount || 0;
      const netAmount = totalAmount - itemDiscount;
      subtotal += netAmount;

      enrichedItems.push({
        product: product._id,
        productName: product.name,
        productCode: product.code,
        quantity: item.quantity,
        unit: product.unit,
        ratePerUnit: item.ratePerUnit,
        totalAmount,
        discount: itemDiscount,
        netAmount,
      });
    }

    const taxAmt = taxPercent ? (subtotal * taxPercent) / 100 : 0;
    const discAmt = discountAmount || 0;
    const grandTotal = subtotal + taxAmt - discAmt;

    const paid = amountPaid || 0;
    const paymentStatus =
      paid === 0 ? "pending" : paid >= grandTotal ? "paid" : "partial";

    const purchaseData = {
      items: enrichedItems,
      supplier,
      subtotal,
      taxPercent: taxPercent || 0,
      taxAmount: taxAmt,
      discountAmount: discAmt,
      grandTotal,
      paymentMethod: paymentMethod || "cash",
      amountPaid: paid,
      paymentStatus,
      purchaseDate: purchaseDate || new Date(),
      invoiceNumber,
      notes,
      purchasedBy: req.user._id,
    };

    if (req.file) {
      purchaseData.invoiceDocument = req.file.path;
    }

    const purchase = await Purchase.create(purchaseData);

    // Update stock
    await updateStockOnPurchase(enrichedItems, "add");

    await purchase.populate([
      { path: "purchasedBy", select: "name email role" },
      { path: "items.product", select: "name code unit" },
    ]);

    res.status(201).json({
      success: true,
      message: "Purchase recorded successfully.",
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all purchases with filters & pagination
// @route   GET /api/purchases
// @access  Private
const getPurchases = async (req, res, next) => {
  try {
    const {
      search,
      paymentStatus,
      status,
      startDate,
      endDate,
      purchasedBy,
      page = 1,
      limit = 20,
      sort = "-purchaseDate",
    } = req.query;

    const query = {};

    // Non-admin users can only see their own purchases
    if (req.user.role === "purchase") {
      query.purchasedBy = req.user._id;
    } else if (purchasedBy) {
      query.purchasedBy = purchasedBy;
    }

    if (search) {
      query.$or = [
        { purchaseNumber: { $regex: search, $options: "i" } },
        { "supplier.name": { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate + "T23:59:59");
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Purchase.countDocuments(query);

    const purchases = await Purchase.find(query)
      .populate("purchasedBy", "name email role")
      .populate("items.product", "name code")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: purchases.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single purchase
// @route   GET /api/purchases/:id
// @access  Private
const getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("purchasedBy", "name email role phone")
      .populate("items.product", "name code unit sellingPrice");

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found." });
    }

    // Non-admin/manager can only see their own
    if (
      req.user.role === "purchase" &&
      purchase.purchasedBy._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment status of a purchase
// @route   PATCH /api/purchases/:id/payment
// @access  Private (Admin, Manager, Purchase)
const updatePayment = async (req, res, next) => {
  try {
    const { amountPaid, paymentMethod } = req.body;
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found." });
    }

    purchase.amountPaid = amountPaid;
    purchase.paymentMethod = paymentMethod || purchase.paymentMethod;
    purchase.paymentStatus =
      amountPaid === 0
        ? "pending"
        : amountPaid >= purchase.grandTotal
          ? "paid"
          : "partial";

    await purchase.save();

    res
      .status(200)
      .json({ success: true, message: "Payment updated.", data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a purchase (reverses stock)
// @route   PATCH /api/purchases/:id/cancel
// @access  Private (Admin)
const cancelPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found." });
    }

    if (purchase.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Purchase already cancelled." });
    }

    purchase.status = "cancelled";
    await purchase.save();

    // Reverse stock
    await updateStockOnPurchase(purchase.items, "remove");

    res
      .status(200)
      .json({
        success: true,
        message: "Purchase cancelled and stock reversed.",
      });
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase summary stats
// @route   GET /api/purchases/stats
// @access  Private (Admin, Manager)
const getPurchaseStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate + "T23:59:59");

    const matchStage = { status: { $ne: "cancelled" } };
    if (Object.keys(dateFilter).length) matchStage.purchaseDate = dateFilter;

    const stats = await Purchase.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$amountPaid" },
          totalPending: { $sum: { $subtract: ["$grandTotal", "$amountPaid"] } },
        },
      },
    ]);

    const byStatus = await Purchase.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          total: { $sum: "$grandTotal" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || {
          totalPurchases: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
        },
        byPaymentStatus: byStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPurchase,
  getPurchases,
  getPurchase,
  updatePayment,
  cancelPurchase,
  getPurchaseStats,
};
