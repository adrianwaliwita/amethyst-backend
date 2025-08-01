const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Amethyst API Gateway",
      version: "1.0.0",
      description: "API Gateway for Amethyst microservices architecture",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    paths: {
      "/api/users": {
        get: {
          tags: ["Users"],
          summary: "Get all users",
          description: "Retrieve all users with pagination and filters",
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        email: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Users"],
          summary: "Create new user",
          description: "Create a new user (deprecated - use auth service)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "User created successfully" },
            400: { description: "Bad request" },
          },
        },
      },
      "/api/bookings": {
        get: {
          tags: ["Bookings"],
          summary: "Get all bookings",
          description: "Retrieve all bookings",
          responses: {
            200: { description: "Successful response" },
          },
        },
        post: {
          tags: ["Bookings"],
          summary: "Create new booking",
          description: "Create a new booking",
          responses: {
            201: { description: "Booking created successfully" },
          },
        },
      },
      "/api/providers": {
        get: {
          tags: ["Providers"],
          summary: "Get all providers",
          description: "Retrieve all service providers",
          responses: {
            200: { description: "Successful response" },
          },
        },
        post: {
          tags: ["Providers"],
          summary: "Create new provider",
          description: "Create a new service provider",
          responses: {
            201: { description: "Provider created successfully" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "User login",
          description: "Authenticate user and return token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "User registration",
          description: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Registration successful" },
            400: { description: "Bad request" },
          },
        },
      },
      "/api/services": {
        get: {
          tags: ["Services"],
          summary: "Get all services",
          description: "Retrieve all available services",
          responses: {
            200: { description: "Successful response" },
          },
        },
        post: {
          tags: ["Services"],
          summary: "Create new service",
          description: "Create a new service",
          responses: {
            201: { description: "Service created successfully" },
          },
        },
      },
      "/api/reviews": {
        get: {
          tags: ["Reviews"],
          summary: "Get all reviews",
          description: "Retrieve all reviews",
          responses: {
            200: { description: "Successful response" },
          },
        },
        post: {
          tags: ["Reviews"],
          summary: "Create new review",
          description: "Create a new review",
          responses: {
            201: { description: "Review created successfully" },
          },
        },
      },
      "/api/customers": {
        get: {
          tags: ["Customers"],
          summary: "Get all customers",
          description: "Retrieve all customers",
          responses: {
            200: { description: "Successful response" },
          },
        },
        post: {
          tags: ["Customers"],
          summary: "Create new customer",
          description: "Create a new customer",
          responses: {
            201: { description: "Customer created successfully" },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Service routes
app.use(
  "/api/users",
  createProxyMiddleware({
    target: "http://localhost:3001",
    changeOrigin: true,
    pathRewrite: { "^/api/users": "" },
  })
);

app.use(
  "/api/bookings",
  createProxyMiddleware({
    target: "http://localhost:3002",
    changeOrigin: true,
    pathRewrite: { "^/api/bookings": "" },
  })
);

app.use(
  "/api/providers",
  createProxyMiddleware({
    target: "http://localhost:3003",
    changeOrigin: true,
    pathRewrite: { "^/api/providers": "" },
  })
);

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: "http://localhost:3004",
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "" },
  })
);

app.use(
  "/api/services",
  createProxyMiddleware({
    target: "http://localhost:3005",
    changeOrigin: true,
    pathRewrite: { "^/api/services": "" },
  })
);

app.use(
  "/api/reviews",
  createProxyMiddleware({
    target: "http://localhost:3006",
    changeOrigin: true,
    pathRewrite: { "^/api/reviews": "" },
  })
);

app.use(
  "/api/customers",
  createProxyMiddleware({
    target: "http://localhost:3007",
    changeOrigin: true,
    pathRewrite: { "^/api/customers": "" },
  })
);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
