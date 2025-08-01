const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

// Register new user
const register = async (req, res) => {
  try {
    const { firebaseUID, name, email, phone, role, location, profileImage } = req.body;

    // Validate input
    const schema = Joi.object({
      firebaseUID: Joi.string().required(),
      name: Joi.string().min(2).max(100),
      email: Joi.string().email().required(),
      phone: Joi.string().min(10).max(15),
      role: Joi.string().valid("CUSTOMER", "PROVIDER", "ADMIN").default("CUSTOMER"),
      location: Joi.string(),
      profileImage: Joi.string(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if Firebase UID already exists
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUID },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already registered" });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        firebaseUID,
        name,
        email,
        phone,
        role: role || "CUSTOMER",
        location,
        profileImage,
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
        createdAt: true,
      },
    });

    // Create related Customer or Provider record
    if (user.role === "CUSTOMER") {
      await prisma.customer.create({
        data: {
          userId: user.id,
          name: user.name || "",
          email: user.email,
          phone: user.phone || "",
        },
      });
    } else if (user.role === "PROVIDER") {
      await prisma.provider.create({
        data: {
          userId: user.id,
          name: user.name || "",
          location: user.location || "",
          experience: 0,
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login user (Firebase Auth)
const login = async (req, res) => {
  try {
    const { firebaseUID } = req.body;

    // Validate input
    const schema = Joi.object({
      firebaseUID: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Find user by Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUID },
      include: {
        customer: true,
        provider: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "User account is deactivated" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        firebaseUID: user.firebaseUID,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        isActive: user.isActive,
        verified: user.verified,
        profileImage: user.profileImage,
        customer: user.customer,
        provider: user.provider,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_RESET_SECRET || "your-reset-secret",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Password reset email sent",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    const schema = Joi.object({
      token: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify reset token
    const decoded = jwt.verify(
      token,
      process.env.JWT_RESET_SECRET || "your-reset-secret"
    );

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired reset token" });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        createdAt: true,
      },
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
    res.status(401).json({ error: "Invalid token" });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    const { name, phone, location, profileImage } = req.body;

    // Validate input
    const schema = Joi.object({
      name: Joi.string().min(2).max(100),
      phone: Joi.string().min(10).max(15),
      location: Joi.string(),
      profileImage: Joi.string(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: { name, phone, location, profileImage },
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
    res.status(401).json({ error: "Invalid token" });
  }
};

// Verify user account
const verifyUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Update user verification status
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: { verified: true },
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

    res.json({ message: "User verified successfully", user });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  verifyUser,
};
