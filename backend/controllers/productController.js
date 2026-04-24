const Product = require("../models/Product");

// @desc    Create a new product/material
// @route   POST /api/products
// @access  Private (Admin, Purchase, Manager)
const createProduct = async (req, res, next) => {
  try {
    const productData = {
      ...req.body,
      createdBy: req.user._id,
    };

    if (req.file) {
      productData.image = req.file.path; // Cloudinary URL
    }

    const product = await Product.create(productData);
    await product.populate("createdBy", "name email role");

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products with filters, search, pagination
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      isActive,
      lowStock,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) query.category = { $regex: category, $options: "i" };
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (lowStock === "true") {
      query.$expr = { $lte: ["$currentStock", "$minimumStock"] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate("createdBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "createdBy",
      "name email role",
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager)
const updateProduct = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      updates.image = req.file.path;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Product deactivated successfully." });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all product categories
// @route   GET /api/products/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct("category", { isActive: true });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getCategories,
};
