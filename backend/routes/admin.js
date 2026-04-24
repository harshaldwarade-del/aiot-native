const express = require("express");
const router = express.Router();
const {
  getDashboard,
  getUsers,
  updateUser,
  resetUserPassword,
  getActivityLog,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

// All admin routes require authentication
router.use(protect);

// Dashboard — Admin & Manager
router.get("/dashboard", authorize("admin", "manager"), getDashboard);

// Activity log — Admin & Manager
router.get("/activity", authorize("admin", "manager"), getActivityLog);

// User management — Admin only
router.get("/users", authorize("admin"), getUsers);
router.put("/users/:id", authorize("admin"), updateUser);
router.patch(
  "/users/:id/reset-password",
  authorize("admin"),
  resetUserPassword,
);

module.exports = router;
