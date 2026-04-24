const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

// Public
router.post("/login", login);

// Protected
router.use(protect);
router.get("/me", getMe);
router.put("/me", updateProfile);
router.put("/change-password", changePassword);

// Admin only
router.post("/register", authorize("admin"), register);

module.exports = router;
