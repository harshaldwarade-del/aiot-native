const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/auth");
const { uploadProductImage } = require("../config/cloudinary");

router.use(protect);

router.get("/categories", getCategories);

router
  .route("/")
  .get(getProducts)
  .post(
    authorize("admin", "manager", "purchase"),
    uploadProductImage.single("image"),
    createProduct,
  );

router
  .route("/:id")
  .get(getProduct)
  .put(
    authorize("admin", "manager"),
    uploadProductImage.single("image"),
    updateProduct,
  )
  .delete(authorize("admin"), deleteProduct);

module.exports = router;
