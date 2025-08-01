const express = require("express");
const router = express.Router();
const providerController = require("../controllers/providerController");

// GET /api/providers
router.get("/", providerController.getAllProviders);

// GET /api/providers/:id
router.get("/:id", providerController.getProviderById);

// POST /api/providers
router.post("/", providerController.createProvider);

// PUT /api/providers/:id
router.put("/:id", providerController.updateProvider);

// DELETE /api/providers/:id
router.delete("/:id", providerController.deleteProvider);

// GET /api/providers/:id/services
router.get("/:id/services", providerController.getProviderServices);

// GET /api/providers/:id/bookings
router.get("/:id/bookings", providerController.getProviderBookings);

// GET /api/providers/:id/availability
router.get("/:id/availability", providerController.getProviderAvailability);

// PUT /api/providers/:id/availability
router.put("/:id/availability", providerController.updateProviderAvailability);

// GET /api/providers/search
router.get("/search", providerController.searchProviders);

// POST /api/providers/:id/documents - Add provider document
router.post("/:id/documents", providerController.addProviderDocument);

// POST /api/providers/:id/addresses - Add provider address
router.post("/:id/addresses", providerController.addProviderAddress);

// PUT /api/providers/:id/bank-details - Update provider bank details
router.put("/:id/bank-details", providerController.updateProviderBankDetails);

module.exports = router;
