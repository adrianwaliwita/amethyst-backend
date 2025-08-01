const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// POST /api/auth/register
router.post("/register", authController.register);

// POST /api/auth/login
router.post("/login", authController.login);

// POST /api/auth/logout
router.post("/logout", authController.logout);

// POST /api/auth/refresh
router.post("/refresh", authController.refreshToken);

// POST /api/auth/forgot-password
router.post("/forgot-password", authController.forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", authController.resetPassword);

// GET /api/auth/verify-email/:token
router.get("/verify-email/:token", authController.verifyEmail);

// GET /api/auth/me
router.get("/me", authController.getCurrentUser);

// PUT /api/auth/update-profile
router.put("/update-profile", authController.updateProfile);

// POST /api/auth/change-password
router.post("/change-password", authController.changePassword);

module.exports = router;
