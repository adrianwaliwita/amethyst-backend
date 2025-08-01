const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// GET /api/reviews - Get all reviews with pagination and filtering
router.get("/", reviewController.getAllReviews);

// GET /api/reviews/service/:serviceId - Get reviews by service
router.get("/service/:serviceId", reviewController.getReviewsByService);

// GET /api/reviews/provider/:providerId - Get reviews by provider
router.get("/provider/:providerId", reviewController.getReviewsByProvider);

// GET /api/reviews/customer/:customerId - Get reviews by customer
router.get("/customer/:customerId", reviewController.getReviewsByCustomer);

// GET /api/reviews/:id - Get review by ID
router.get("/:id", reviewController.getReviewById);

// POST /api/reviews - Create new review
router.post("/", reviewController.createReview);

// PUT /api/reviews/:id - Update review
router.put("/:id", reviewController.updateReview);

// DELETE /api/reviews/:id - Delete review
router.delete("/:id", reviewController.deleteReview);

module.exports = router;
