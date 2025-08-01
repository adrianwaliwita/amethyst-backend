const prisma = require("../../prisma/client");
const Joi = require("joi");

// Get all services with pagination and filtering
const getAllServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      location,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { isActive: true };
    if (category) where.categoryId = category;
    if (minPrice) where.price = { gte: parseFloat(minPrice) };
    if (maxPrice)
      where.price = { ...where.price, lte: parseFloat(maxPrice) };

    const orderBy = { [sortBy]: sortOrder === "asc" ? "asc" : "desc" };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: true,
          _count: { select: { bookings: true, reviews: true } },
        },
      }),
      prisma.service.count({ where }),
    ]);

    res.json({
      services,
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

// Get service by ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            customer: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new service
const createService = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      price,
      originalPrice,
      discount,
      duration,
      description,
      image,
      requirements,
      tags,
      isActive = true,
    } = req.body;

    if (!categoryId || !name || !price || !duration) {
      return res.status(400).json({ error: "categoryId, name, price, and duration are required" });
    }

    const service = await prisma.service.create({
      data: {
        categoryId,
        name,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        discount: discount ? parseFloat(discount) : 0,
        duration: parseInt(duration),
        description,
        image,
        requirements: requirements || [],
        tags: tags || [],
        isActive,
      },
      include: {
        category: true,
      },
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.price)
      updateData.price = parseFloat(req.body.price);
    if (req.body.originalPrice)
      updateData.originalPrice = parseFloat(req.body.originalPrice);
    if (req.body.discount)
      updateData.discount = parseFloat(req.body.discount);
    if (req.body.duration) updateData.duration = parseInt(req.body.duration);
    if (req.body.image) updateData.image = req.body.image;
    if (req.body.requirements) updateData.requirements = req.body.requirements;
    if (req.body.tags) updateData.tags = req.body.tags;
    if (req.body.isActive !== undefined)
      updateData.isActive = req.body.isActive;

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
    res.json(service);
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Service not found" });
    res.status(500).json({ error: error.message });
  }
};

// Delete service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.service.delete({ where: { id } });
    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Service not found" });
    res.status(500).json({ error: error.message });
  }
};

// Search services
const searchServices = async (req, res) => {
  try {
    const {
      q,
      category,
      location,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { isActive: true };
    if (q)
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { hasSome: [q] } },
      ];
    if (category) where.categoryId = category;
    if (minPrice) where.price = { gte: parseFloat(minPrice) };
    if (maxPrice)
      where.price = { ...where.price, lte: parseFloat(maxPrice) };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          _count: { select: { bookings: true, reviews: true } },
        },
      }),
      prisma.service.count({ where }),
    ]);

    res.json({
      services,
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

// Get services by category
const getServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { categoryId, isActive: true };
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          _count: { select: { bookings: true, reviews: true } },
        },
      }),
      prisma.service.count({ where }),
    ]);

    res.json({
      services,
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

// Get services by provider (deprecated)
const getServicesByProvider = async (req, res) => {
  try {
    // This endpoint doesn't make sense in the new schema
    // Services are now global and not provider-specific
    return res.status(400).json({ 
      error: "Services are no longer provider-specific. Use /services with category filters instead.",
      suggestion: "Use GET /services?category=<categoryId> to get services by category"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update service status
const updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const service = await prisma.service.update({
      where: { id },
      data: { isActive },
      include: {
        category: true,
      },
    });
    res.json(service);
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Service not found" });
    res.status(500).json({ error: error.message });
  }
};

// Get all service categories
const getAllServiceCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        _count: { select: { services: true } },
      },
      orderBy: { name: "asc" },
    });

    const total = await prisma.serviceCategory.count({ where: { isActive: true } });

    res.json({
      categories,
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

// Create service category
const createServiceCategory = async (req, res) => {
  try {
    const { name, icon, color, image, description, isActive = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const category = await prisma.serviceCategory.create({
      data: {
        name,
        icon,
        color,
        image,
        description,
        isActive,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  searchServices,
  getServicesByCategory,
  getServicesByProvider,
  updateServiceStatus,
  getAllServiceCategories,
  createServiceCategory,
};
