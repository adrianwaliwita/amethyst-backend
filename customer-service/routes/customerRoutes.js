const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");

// GET /customers - Get all customers with pagination
router.get("/", customerController.getAllCustomers);

// GET /customers/:id - Get customer by ID
router.get("/:id", customerController.getCustomerById);

// GET /customers/:id/bookings - Get customer bookings
router.get("/:id/bookings", customerController.getCustomerBookings);

// POST /customers - Create new customer
router.post("/", customerController.createCustomer);

// POST /customers/:id/addresses - Add customer address
router.post("/:id/addresses", customerController.addCustomerAddress);

// PATCH /customers/:id - Update customer
router.patch("/:id", customerController.updateCustomer);

// PUT /customers/:id/preferences - Update customer preferences
router.put("/:id/preferences", customerController.updateCustomerPreferences);

// DELETE /customers/:id - Delete customer
router.delete("/:id", customerController.deleteCustomer);

module.exports = router;
