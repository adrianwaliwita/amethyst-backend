const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { validateBooking } = require("../middleware/validation");

// Routes
router.get("/", bookingController.getAllBookings);
router.get("/:id", bookingController.getBookingById);
router.post("/", validateBooking, bookingController.createBooking);
router.put("/:id", validateBooking, bookingController.updateBooking);
router.delete("/:id", bookingController.deleteBooking);
router.patch("/:id/status", bookingController.updateBookingStatus);
router.get("/customer/:customerId", bookingController.getBookingsByCustomer);
router.get("/provider/:providerId", bookingController.getBookingsByProvider);
router.get("/service/:serviceId", bookingController.getBookingsByService);

module.exports = router;
