const Sale = require("../models/Sale");
const Product = require("../models/Product");

// Helper: update stock on sale
const updateStockOnSale = async (items, operation = "deduct") => {
  for (const item of items) {
    const delta = operation === "deduct" ? -item.quantity : item.quantity;
    await Product.findByIdAndUpdate(item.product, {
      $inc: { currentStock: delta },
    });
  }
};

// @desc    Create a new sale
// @route   POST /api/sales
// @access  Private (Admin, Sales, Manager)
const createSale = async (req, res, next) => {
  try {
    const {
      items,
      customer,
      taxPercent,
      discountAmount,
      paymentMethod,
      amountReceived,
      saleDate,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one item is required." });
    }

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
      if (!product.isActive) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Product ${product.name} is inactive.`,
          });
      }
      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}.`,
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

    const received = amountReceived || 0;
    const paymentStatus =
      received === 0 ? "pending" : received >= grandTotal ? "paid" : "partial";

    const saleData = {
      items: enrichedItems,
      customer,
      subtotal,
      taxPercent: taxPercent || 0,
      taxAmount: taxAmt,
      discountAmount: discAmt,
      grandTotal,
      paymentMethod: paymentMethod || "cash",
      amountReceived: received,
      paymentStatus,
      saleDate: saleDate || new Date(),
      notes,
      soldBy: req.user._id,
    };

    if (req.file) {
      saleData.invoiceDocument = req.file.path;
    }

    const sale = await Sale.create(saleData);

    // Deduct stock
    await updateStockOnSale(enrichedItems, "deduct");

    await sale.populate([
      { path: "soldBy", select: "name email role" },
      { path: "items.product", select: "name code unit" },
    ]);

    res.status(201).json({
      success: true,
      message: "Sale recorded successfully.",
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sales with filters & pagination
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res, next) => {
  try {
    const {
      search,
      paymentStatus,
      status,
      startDate,
      endDate,
      soldBy,
      page = 1,
      limit = 20,
      sort = "-saleDate",
    } = req.query;

    const query = {};

    // Sales role can only see their own
    if (req.user.role === "sales") {
      query.soldBy = req.user._id;
    } else if (soldBy) {
      query.soldBy = soldBy;
    }

    if (search) {
      query.$or = [
        { saleNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
      ];
    }

    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) query.saleDate.$lte = new Date(endDate + "T23:59:59");
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Sale.countDocuments(query);

    const sales = await Sale.find(query)
      .populate("soldBy", "name email role")
      .populate("items.product", "name code")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single sale
// @route   GET /api/sales/:id
// @access  Private
const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("soldBy", "name email role phone")
      .populate("items.product", "name code unit purchasePrice");

    if (!sale) {
      return res
        .status(404)
        .json({ success: false, message: "Sale not found." });
    }

    if (
      req.user.role === "sales" &&
      sale.soldBy._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment for a sale
// @route   PATCH /api/sales/:id/payment
// @access  Private
const updatePayment = async (req, res, next) => {
  try {
    const { amountReceived, paymentMethod } = req.body;
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res
        .status(404)
        .json({ success: false, message: "Sale not found." });
    }

    sale.amountReceived = amountReceived;
    sale.paymentMethod = paymentMethod || sale.paymentMethod;
    sale.paymentStatus =
      amountReceived === 0
        ? "pending"
        : amountReceived >= sale.grandTotal
          ? "paid"
          : "partial";

    await sale.save();

    res
      .status(200)
      .json({ success: true, message: "Payment updated.", data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a sale (restores stock)
// @route   PATCH /api/sales/:id/cancel
// @access  Private (Admin)
const cancelSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res
        .status(404)
        .json({ success: false, message: "Sale not found." });
    }

    if (sale.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Sale already cancelled." });
    }

    sale.status = "cancelled";
    await sale.save();

    // Restore stock
    await updateStockOnSale(sale.items, "restore");

    res
      .status(200)
      .json({ success: true, message: "Sale cancelled and stock restored." });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales summary stats
// @route   GET /api/sales/stats
// @access  Private (Admin, Manager)
const getSalesStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { status: { $ne: "cancelled" } };

    if (req.user.role === "sales") {
      matchStage.soldBy = req.user._id;
    }

    if (startDate || endDate) {
      matchStage.saleDate = {};
      if (startDate) matchStage.saleDate.$gte = new Date(startDate);
      if (endDate) matchStage.saleDate.$lte = new Date(endDate + "T23:59:59");
    }

    const stats = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$grandTotal" },
          totalReceived: { $sum: "$amountReceived" },
          totalPending: {
            $sum: { $subtract: ["$grandTotal", "$amountReceived"] },
          },
        },
      },
    ]);

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.productName" },
          totalQty: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.netAmount" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]);

    // Sales by rep (admin/manager only)
    const salesByRep =
      req.user.role !== "sales"
        ? await Sale.aggregate([
            { $match: matchStage },
            {
              $group: {
                _id: "$soldBy",
                totalSales: { $sum: 1 },
                totalRevenue: { $sum: "$grandTotal" },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                "user.name": 1,
                "user.email": 1,
                totalSales: 1,
                totalRevenue: 1,
              },
            },
            { $sort: { totalRevenue: -1 } },
          ])
        : [];

    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalReceived: 0,
          totalPending: 0,
        },
        topProducts,
        salesByRep,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  getSales,
  getSale,
  updatePayment,
  cancelSale,
  getSalesStats,
};
