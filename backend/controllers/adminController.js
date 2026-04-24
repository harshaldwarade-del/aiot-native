const User = require("../models/User");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");

// @desc    Admin dashboard overview
// @route   GET /api/admin/dashboard
// @access  Private (Admin, Manager)
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    // Counts
    const [
      totalProducts,
      lowStockCount,
      totalUsers,
      totalSales,
      totalPurchases,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({
        isActive: true,
        $expr: { $lte: ["$currentStock", "$minimumStock"] },
      }),
      User.countDocuments({ isActive: true }),
      Sale.countDocuments({ status: { $ne: "cancelled" } }),
      Purchase.countDocuments({ status: { $ne: "cancelled" } }),
    ]);

    // Revenue this month
    const [monthSales] = await Sale.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          saleDate: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Purchases this month
    const [monthPurchases] = await Purchase.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          purchaseDate: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          expense: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Today's activity
    const [todaySales] = await Sale.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          saleDate: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent sales (last 5)
    const recentSales = await Sale.find({ status: { $ne: "cancelled" } })
      .populate("soldBy", "name")
      .sort("-saleDate")
      .limit(5)
      .select(
        "saleNumber customer.name grandTotal saleDate paymentStatus soldBy",
      );

    // Recent purchases (last 5)
    const recentPurchases = await Purchase.find({
      status: { $ne: "cancelled" },
    })
      .populate("purchasedBy", "name")
      .sort("-purchaseDate")
      .limit(5)
      .select(
        "purchaseNumber supplier.name grandTotal purchaseDate paymentStatus purchasedBy",
      );

    // Low stock products
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ["$currentStock", "$minimumStock"] },
    })
      .select("name code currentStock minimumStock unit")
      .limit(10);

    // Monthly sales trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const salesTrend = await Sale.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          saleDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$saleDate" },
            month: { $month: "$saleDate" },
          },
          revenue: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const purchaseTrend = await Purchase.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          purchaseDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$purchaseDate" },
            month: { $month: "$purchaseDate" },
          },
          expense: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalProducts,
          lowStockCount,
          totalUsers,
          totalSales,
          totalPurchases,
        },
        thisMonth: {
          revenue: monthSales?.revenue || 0,
          salesCount: monthSales?.count || 0,
          expense: monthPurchases?.expense || 0,
          purchaseCount: monthPurchases?.count || 0,
          profit: (monthSales?.revenue || 0) - (monthPurchases?.expense || 0),
        },
        today: {
          revenue: todaySales?.revenue || 0,
          salesCount: todaySales?.count || 0,
        },
        recentSales,
        recentPurchases,
        lowStockProducts,
        trends: {
          sales: salesTrend,
          purchases: purchaseTrend,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const { search, role, isActive, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user (role, status)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const allowedUpdates = ["name", "role", "isActive", "phone", "department"];
    const updates = {};
    allowedUpdates.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "User updated.", data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset a user's password (admin)
// @route   PATCH /api/admin/users/:id/reset-password
// @access  Private (Admin)
const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters.",
        });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity log (combined sales + purchases)
// @route   GET /api/admin/activity
// @access  Private (Admin, Manager)
const getActivityLog = async (req, res, next) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 30 } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate + "T23:59:59");
    }

    let salesData = [],
      purchasesData = [];

    if (!type || type === "sale") {
      const sQuery = {};
      if (Object.keys(dateFilter).length) sQuery.saleDate = dateFilter;
      salesData = await Sale.find(sQuery)
        .populate("soldBy", "name email")
        .sort("-saleDate")
        .select(
          "saleNumber customer.name grandTotal saleDate paymentStatus status soldBy items",
        )
        .lean();
      salesData = salesData.map((s) => ({ ...s, type: "sale" }));
    }

    if (!type || type === "purchase") {
      const pQuery = {};
      if (Object.keys(dateFilter).length) pQuery.purchaseDate = dateFilter;
      purchasesData = await Purchase.find(pQuery)
        .populate("purchasedBy", "name email")
        .sort("-purchaseDate")
        .select(
          "purchaseNumber supplier.name grandTotal purchaseDate paymentStatus status purchasedBy items",
        )
        .lean();
      purchasesData = purchasesData.map((p) => ({ ...p, type: "purchase" }));
    }

    // Merge & sort by date
    const combined = [...salesData, ...purchasesData].sort(
      (a, b) =>
        new Date(b.saleDate || b.purchaseDate) -
        new Date(a.saleDate || a.purchaseDate),
    );

    const total = combined.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = combined.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: paginated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getUsers,
  updateUser,
  resetUserPassword,
  getActivityLog,
};
