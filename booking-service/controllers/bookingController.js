const prisma = require("../../prisma/client");
const Joi = require("joi");

// Get all bookings
const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customerId, providerId } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (providerId) where.providerId = providerId;

    const bookings = await prisma.booking.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        provider: {
          select: { id: true, name: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.booking.count({ where });

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            duration: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate booking number
const generateBookingNumber = () => {
  const prefix = "AME";
  const randomPart = Math.random().toString(36).substr(2, 6).toUpperCase();
  return prefix + randomPart;
};

// Create new booking
const createBooking = async (req, res) => {
  try {
    const {
      customerId,
      providerId,
      serviceId,
      customerAddress,
      scheduledDate,
      scheduledTime,
      paymentMethod,
      pricing,
      specialInstructions = "",
    } = req.body;

    // Check for conflicting bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        providerId,
        scheduledDate,
        scheduledTime,
        status: { notIn: ["cancelled", "completed"] },
      },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        error: "Provider is not available at the selected time",
      });
    }

    const bookingNumber = generateBookingNumber();

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        providerId,
        serviceId,
        customerAddress,
        scheduledDate,
        scheduledTime,
        paymentMethod,
        pricing,
        specialInstructions,
        status: "pending",
        paymentStatus: "pending",
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        provider: {
          select: { id: true, name: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update booking
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        provider: {
          select: { id: true, name: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    res.json(booking);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "accepted", 
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error:
          "Invalid status. Must be one of: pending, accepted, confirmed, in_progress, completed, cancelled",
      });
    }

    const updateData = { status };
    
    // Set completedAt timestamp when marking as completed
    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        provider: {
          select: { id: true, name: true, businessName: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
        customerAddress: true,
        providerAddress: true,
        pricing: true,
        paymentMethod: true,
        payment: true,
        review: true,
      },
    });

    res.json(booking);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete booking
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.booking.delete({
      where: { id },
    });

    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get bookings by customer
const getBookingsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const bookings = await prisma.booking.findMany({
      where: { customerId },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        provider: {
          select: { id: true, name: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.booking.count({
      where: { customerId },
    });

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get bookings by provider
const getBookingsByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = { providerId };
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.booking.count({ where });

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get bookings by service
const getBookingsByService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const bookings = await prisma.booking.findMany({
      where: { serviceId },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        provider: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.booking.count({
      where: { serviceId },
    });

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  getBookingsByCustomer,
  getBookingsByProvider,
  getBookingsByService,
};
