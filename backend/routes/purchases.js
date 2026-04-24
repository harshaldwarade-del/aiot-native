const express = require("express");
const router = express.Router();
const {
  createPurchase,
  getPurchases,
  getPurchase,
  updatePayment,
  cancelPurchase,
  getPurchaseStats,
} = require("../controllers/purchaseController");
const { protect, authorize } = require("../middleware/auth");
const { uploadDocument } = require("../config/cloudinary");

router.use(protect);

router.get("/stats", authorize("admin", "manager"), getPurchaseStats);

router
  .route("/")
  .get(getPurchases)
  .post(
    authorize("admin", "purchase", "manager"),
    uploadDocument.single("invoiceDocument"),
    createPurchase,
  );

router.route("/:id").get(getPurchase);

router.patch(
  "/:id/payment",
  authorize("admin", "purchase", "manager"),
  updatePayment,
);

router.patch("/:id/cancel", authorize("admin"), cancelPurchase);

module.exports = router;
