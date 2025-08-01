const prisma = require("../../prisma/client");
const Joi = require("joi");

// Get all reviews with pagination and filtering
const getAllReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      serviceId,
      providerId,
      customerId,
      rating,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = {};
    if (serviceId) where.serviceId = parseInt(serviceId);
    if (providerId) where.providerId = parseInt(providerId);
    if (customerId) where.customerId = parseInt(customerId);
    if (rating) where.rating = parseInt(rating);

    const orderBy = { [sortBy]: sortOrder === "asc" ? "asc" : "desc" };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          service: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, businessName: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get review by ID
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        service: { select: { id: true, title: true, providerId: true } },
        provider: { select: { id: true, businessName: true } },
      },
    });

    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new review
const createReview = async (req, res) => {
  try {
    const { customerId, serviceId, providerId, rating, comment, bookingId } =
      req.body;

    // Validate required fields
    if (!customerId || !serviceId || !providerId || !rating) {
      return res.status(400).json({
        error: "customerId, serviceId, providerId, and rating are required",
      });
    }

    // Check if customer has already reviewed this service
    const existingReview = await prisma.review.findFirst({
      where: {
        customerId: parseInt(customerId),
        serviceId: parseInt(serviceId),
      },
    });

    if (existingReview) {
      return res
        .status(400)
        .json({ error: "You have already reviewed this service" });
    }

    // Check if booking exists and is completed
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
      });

      if (!booking) {
        return res.status(400).json({ error: "Booking not found" });
      }

      if (booking.status !== "COMPLETED") {
        return res
          .status(400)
          .json({ error: "Can only review completed bookings" });
      }
    }

    const review = await prisma.review.create({
      data: {
        customerId: parseInt(customerId),
        serviceId: parseInt(serviceId),
        providerId: parseInt(providerId),
        rating: parseInt(rating),
        comment: comment || null,
        bookingId: bookingId ? parseInt(bookingId) : null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { id: true, title: true } },
        provider: { select: { id: true, businessName: true } },
      },
    });

    // Update provider rating
    await updateProviderRating(providerId);

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update review
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await prisma.review.update({
      where: { id: parseInt(id) },
      data: {
        rating: rating ? parseInt(rating) : undefined,
        comment: comment !== undefined ? comment : undefined,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { id: true, title: true } },
        provider: { select: { id: true, businessName: true } },
      },
    });

    // Update provider rating
    await updateProviderRating(review.providerId);

    res.json(review);
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Review not found" });
    res.status(500).json({ error: error.message });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) },
    });

    if (!review) return res.status(404).json({ error: "Review not found" });

    await prisma.review.delete({ where: { id: parseInt(id) } });

    // Update provider rating
    await updateProviderRating(review.providerId);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Review not found" });
    res.status(500).json({ error: error.message });
  }
};

// Get reviews by service
const getReviewsByService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { serviceId: parseInt(serviceId) };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          provider: { select: { id: true, businessName: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      reviews,
      averageRating: avgRating._avg.rating || 0,
      totalReviews: avgRating._count.rating,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get reviews by provider
const getReviewsByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { providerId: parseInt(providerId) };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          service: { select: { id: true, title: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      reviews,
      averageRating: avgRating._avg.rating || 0,
      totalReviews: avgRating._count.rating,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get reviews by customer
const getReviewsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { customerId: parseInt(customerId) };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          service: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true, businessName: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to update provider rating
const updateProviderRating = async (providerId) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { providerId: parseInt(providerId) },
    });

    if (reviews.length > 0) {
      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const averageRating = totalRating / reviews.length;

      await prisma.provider.update({
        where: { id: parseInt(providerId) },
        data: { rating: averageRating, totalReviews: reviews.length },
      });
    } else {
      await prisma.provider.update({
        where: { id: parseInt(providerId) },
        data: { rating: 0, totalReviews: 0 },
      });
    }
  } catch (error) {
    console.error("Error updating provider rating:", error);
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getReviewsByService,
  getReviewsByProvider,
  getReviewsByCustomer,
};
