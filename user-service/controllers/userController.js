const prisma = require("../../prisma/client");
const Joi = require("joi");

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, verified } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (verified !== undefined) where.verified = verified === 'true';

    const users = await prisma.user.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        customer: {
          select: {
            id: true,
            totalBookings: true,
          },
        },
        provider: {
          select: {
            id: true,
            businessName: true,
            rating: true,
            totalReviews: true,
            completedBookings: true,
            isApproved: true,
            available: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
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

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            addresses: true,
            preferences: true,
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
        },
        provider: {
          include: {
            addresses: true,
            availability: true,
            documents: true,
            bankDetails: true,
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new user (moved to auth service)
const createUser = async (req, res) => {
  try {
    return res.status(400).json({ 
      error: "User creation has been moved to the auth service. Use POST /auth/register instead." 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, location, profileImage, isActive, verified } = req.body;

    // Validate input
    const schema = Joi.object({
      name: Joi.string().min(2).max(100),
      phone: Joi.string().min(10).max(15),
      location: Joi.string(),
      profileImage: Joi.string(),
      isActive: Joi.boolean(),
      verified: Joi.boolean(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        location,
        profileImage,
        isActive,
        verified,
      },
      select: {
        id: true,
        firebaseUID: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        location: true,
        isActive: true,
        verified: true,
        profileImage: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related records first
    await prisma.$transaction(async (prisma) => {
      // Delete customer record if exists
      const customer = await prisma.customer.findUnique({
        where: { userId: id },
      });
      if (customer) {
        await prisma.customer.delete({
          where: { userId: id },
        });
      }

      // Delete provider record if exists
      const provider = await prisma.provider.findUnique({
        where: { userId: id },
      });
      if (provider) {
        await prisma.provider.delete({
          where: { userId: id },
        });
      }

      // Finally delete the user
      await prisma.user.delete({
        where: { id },
      });
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q, role, location } = req.query;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        role ? { role } : {},
        location
          ? { location: { contains: location, mode: "insensitive" } }
          : {},
        { isActive: true },
      ],
    };

    const users = await prisma.user.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        customer: {
          select: {
            id: true,
            totalBookings: true,
          },
        },
        provider: {
          select: {
            id: true,
            businessName: true,
            rating: true,
            isApproved: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
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

// Get user by Firebase UID
const getUserByFirebaseUID = async (req, res) => {
  try {
    const { firebaseUID } = req.params;
    const user = await prisma.user.findUnique({
      where: { firebaseUID },
      include: {
        customer: true,
        provider: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  getUserByFirebaseUID,
};
