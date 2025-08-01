const validateBooking = (req, res, next) => {
  const {
    customerId,
    providerId,
    serviceId,
    bookingDate,
    startTime,
    endTime,
    totalAmount,
  } = req.body;

  if (
    !customerId ||
    !providerId ||
    !serviceId ||
    !bookingDate ||
    !startTime ||
    !endTime ||
    !totalAmount
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (isNaN(totalAmount) || totalAmount <= 0) {
    return res
      .status(400)
      .json({ error: "Total amount must be a positive number" });
  }

  next();
};

const validateBookingUpdate = (req, res, next) => {
  const { bookingDate, startTime, endTime, totalAmount, status } = req.body;

  if (totalAmount && (isNaN(totalAmount) || totalAmount <= 0)) {
    return res
      .status(400)
      .json({ error: "Total amount must be a positive number" });
  }

  if (
    status &&
    !["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status)
  ) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  next();
};

module.exports = {
  validateBooking,
  validateBookingUpdate,
};
