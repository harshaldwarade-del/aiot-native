const express = require("express");
const router = express.Router();
const {
  createSale,
  getSales,
  getSale,
  updatePayment,
  cancelSale,
  getSalesStats,
} = require("../controllers/salesController");
const { protect, authorize } = require("../middleware/auth");
const { uploadDocument } = require("../config/cloudinary");

router.use(protect);

router.get("/stats", getSalesStats);

router
  .route("/")
  .get(getSales)
  .post(
    authorize("admin", "sales", "manager"),
    uploadDocument.single("invoiceDocument"),
    createSale,
  );

router.route("/:id").get(getSale);

router.patch(
  "/:id/payment",
  authorize("admin", "sales", "manager"),
  updatePayment,
);

router.patch("/:id/cancel", authorize("admin"), cancelSale);

module.exports = router;
