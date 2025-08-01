const prisma = require("../../prisma/client");

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const customers = await prisma.customer.findMany({
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
            createdAt: true,
          },
        },
        addresses: true,
        preferences: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.customer.count();

    res.status(200).json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
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
        preferences: true,
        bookings: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            provider: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reviews: {
          include: {
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

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const { userId, name, email, phone } = req.body;

    if (!userId || !name || !email || !phone) {
      return res.status(400).json({ error: "userId, name, email, and phone are required" });
    }

    // Check if customer already exists for this user
    const existingCustomer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (existingCustomer) {
      return res.status(409).json({ error: "Customer already exists for this user" });
    }

    const customer = await prisma.customer.create({
      data: {
        userId,
        name,
        email,
        phone,
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

    res.status(201).json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Failed to create customer" });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone,
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
        addresses: true,
        preferences: true,
      },
    });

    res.status(200).json(customer);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Customer not found" });
    }
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Failed to update customer" });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.customer.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
};

// Add customer address
const addCustomerAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, label, street, city, state, zipCode, latitude, longitude, isDefault } = req.body;

    // If this is set as default, update other addresses to not be default
    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        customerId: id,
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
    console.error("Error adding customer address:", error);
    res.status(500).json({ error: "Failed to add customer address" });
  }
};

// Update customer preferences
const updateCustomerPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { preferredProviders, favoriteServices, minPrice, maxPrice, preferredTimeSlots } = req.body;

    const preferences = await prisma.preferences.upsert({
      where: { customerId: id },
      update: {
        preferredProviders,
        favoriteServices,
        minPrice,
        maxPrice,
        preferredTimeSlots,
      },
      create: {
        customerId: id,
        preferredProviders: preferredProviders || [],
        favoriteServices: favoriteServices || [],
        minPrice,
        maxPrice,
        preferredTimeSlots: preferredTimeSlots || [],
      },
    });

    res.status(200).json(preferences);
  } catch (error) {
    console.error("Error updating customer preferences:", error);
    res.status(500).json({ error: "Failed to update customer preferences" });
  }
};

// Get customer bookings
const getCustomerBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = { customerId: id };
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            rating: true,
          },
        },
        review: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.booking.count({ where });

    res.status(200).json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customer bookings:", error);
    res.status(500).json({ error: "Failed to fetch customer bookings" });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerAddress,
  updateCustomerPreferences,
  getCustomerBookings,
};
