const prisma = require("../../prisma/client");
const Joi = require("joi");
const bcrypt = require("bcryptjs");

// Get all providers
const getAllProviders = async (req, res) => {
  try {
    const { page = 1, limit = 10, services, location, rating, available, approved } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (services) {
      where.services = { hasSome: services.split(',') };
    }
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (rating) where.rating = { gte: parseFloat(rating) };
    if (available !== undefined) where.available = available === 'true';
    if (approved !== undefined) where.isApproved = approved === 'true';

    const providers = await prisma.provider.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            isActive: true,
            verified: true,
            profileImage: true,
          },
        },
        addresses: true,
        availability: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.provider.count({ where });

    res.json({
      providers,
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

// Get provider by ID
const getProviderById = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firebaseUID: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            isActive: true,
            verified: true,
            profileImage: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        addresses: true,
        availability: true,
        documents: true,
        bankDetails: true,
        bookings: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reviews: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new provider
const createProvider = async (req, res) => {
  try {
    const {
      userId,
      name,
      businessName,
      bio,
      services,
      serviceCategories,
      experience,
      location,
    } = req.body;

    if (!userId || !name || !location) {
      return res.status(400).json({ error: "userId, name, and location are required" });
    }

    // Check if provider already exists for this user
    const existingProvider = await prisma.provider.findUnique({
      where: { userId },
    });

    if (existingProvider) {
      return res.status(409).json({ error: "Provider already exists for this user" });
    }

    const provider = await prisma.provider.create({
      data: {
        userId,
        name,
        businessName,
        bio,
        services: services || [],
        serviceCategories: serviceCategories || [],
        experience: experience || 0,
        location,
        rating: 0,
        totalReviews: 0,
        completedBookings: 0,
        isApproved: false,
        available: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(201).json(provider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update provider
const updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.userId;
    delete updateData.rating;
    delete updateData.totalReviews;
    delete updateData.completedBookings;

    const provider = await prisma.provider.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            profileImage: true,
          },
        },
        addresses: true,
        availability: true,
      },
    });

    res.json(provider);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Provider not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete provider
const deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.provider.delete({
      where: { id },
    });

    res.json({ message: "Provider deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Provider not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get provider services (from service catalog)
const getProviderServices = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get provider to check their service categories
    const provider = await prisma.provider.findUnique({
      where: { id },
      select: { services: true, serviceCategories: true },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Get services from the service catalog that match provider's categories
    const services = await prisma.service.findMany({
      where: {
        OR: [
          { name: { in: provider.services } },
          { category: { name: { in: provider.serviceCategories } } },
        ],
        isActive: true,
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.service.count({
      where: {
        OR: [
          { name: { in: provider.services } },
          { category: { name: { in: provider.serviceCategories } } },
        ],
        isActive: true,
      },
    });

    res.json({
      services,
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

// Get provider bookings
const getProviderBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = { providerId: id };
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        service: {
          select: { id: true, name: true, price: true, duration: true },
        },
        customerAddress: true,
        providerAddress: true,
        pricing: true,
        paymentMethod: true,
        payment: true,
        review: true,
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

// Get provider availability
const getProviderAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const availability = await prisma.availabilitySlot.findMany({
      where: { providerId: id },
      orderBy: { day: "asc" },
    });

    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update provider availability
const updateProviderAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;

    // Delete existing availability
    await prisma.availabilitySlot.deleteMany({
      where: { providerId: id },
    });

    // Create new availability
    const newAvailability = await prisma.availabilitySlot.createMany({
      data: availability.map((slot) => ({
        providerId: id,
        day: slot.day,
        isAvailable: slot.isAvailable,
        slots: slot.slots,
      })),
    });

    res.json({ message: "Availability updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search providers
const searchProviders = async (req, res) => {
  try {
    const { q, services, location, minRating } = req.query;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { businessName: { contains: q, mode: "insensitive" } },
                { services: { hasSome: [q] } },
                { serviceCategories: { hasSome: [q] } },
              ],
            }
          : {},
        services
          ? { services: { hasSome: services.split(',') } }
          : {},
        location
          ? { location: { contains: location, mode: "insensitive" } }
          : {},
        minRating ? { rating: { gte: parseFloat(minRating) } } : {},
        { isApproved: true },
        { available: true },
      ],
    };

    const providers = await prisma.provider.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            profileImage: true,
          },
        },
        addresses: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
      orderBy: { rating: "desc" },
    });

    const total = await prisma.provider.count({ where });

    res.json({
      providers,
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

// Add provider document
const addProviderDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, documentUrl, status } = req.body;

    if (!type || !documentUrl) {
      return res.status(400).json({ error: "type and documentUrl are required" });
    }

    const document = await prisma.providerDocument.create({
      data: {
        providerId: id,
        type,
        documentUrl,
        status: status || "pending",
      },
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update provider bank details
const updateProviderBankDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountNumber, ifscCode, accountHolderName } = req.body;

    const bankDetails = await prisma.bankDetails.upsert({
      where: { providerId: id },
      update: {
        accountNumber,
        ifscCode,
        accountHolderName,
      },
      create: {
        providerId: id,
        accountNumber,
        ifscCode,
        accountHolderName,
      },
    });

    res.json(bankDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add provider address
const addProviderAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, label, street, city, state, zipCode, latitude, longitude, isDefault } = req.body;

    // If this is set as default, update other addresses to not be default
    if (isDefault) {
      await prisma.address.updateMany({
        where: { providerId: id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        providerId: id,
        type,
        label,
        street,
        city,
        state,
        zipCode,
        latitude,
        longitude,
        isDefault,
      },
    });

    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderServices,
  getProviderBookings,
  getProviderAvailability,
  updateProviderAvailability,
  searchProviders,
  addProviderDocument,
  updateProviderBankDetails,
  addProviderAddress,
};
