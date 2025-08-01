const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// GET /users - Get all users with pagination and filters
router.get("/", userController.getAllUsers);

// GET /users/search - Search users
router.get("/search", userController.searchUsers);

// GET /users/firebase/:firebaseUID - Get user by Firebase UID
router.get("/firebase/:firebaseUID", userController.getUserByFirebaseUID);

// GET /users/:id - Get user by ID
router.get("/:id", userController.getUserById);

// POST /users - Create new user (deprecated - use auth service)
router.post("/", userController.createUser);

// PATCH /users/:id - Update user
router.patch("/:id", userController.updateUser);

// DELETE /users/:id - Delete user
router.delete("/:id", userController.deleteUser);

module.exports = router;
