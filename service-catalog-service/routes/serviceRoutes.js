const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");

// GET /api/services - Get all services with pagination and filtering
router.get("/", serviceController.getAllServices);

// GET /api/services/search - Search services
router.get("/search", serviceController.searchServices);

// GET /api/services/category/:categoryId - Get services by category
router.get("/category/:categoryId", serviceController.getServicesByCategory);

// GET /api/services/provider/:providerId - Get services by provider
router.get("/provider/:providerId", serviceController.getServicesByProvider);

// GET /api/services/:id - Get service by ID
router.get("/:id", serviceController.getServiceById);

// POST /api/services - Create new service
router.post("/", serviceController.createService);

// PUT /api/services/:id - Update service
router.put("/:id", serviceController.updateService);

// PATCH /api/services/:id/status - Update service status
router.patch("/:id/status", serviceController.updateServiceStatus);

// DELETE /api/services/:id - Delete service
router.delete("/:id", serviceController.deleteService);

// GET /api/categories - Get all service categories
router.get("/categories", serviceController.getAllServiceCategories);

// POST /api/categories - Create service category
router.post("/categories", serviceController.createServiceCategory);

module.exports = router;
