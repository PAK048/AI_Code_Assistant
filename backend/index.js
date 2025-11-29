// Load environment variables FIRST before any other requires
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const agentRoutes = require("./routes/agentRoutes");
const dataRoutes = require("./routes/dataRoutes");
const projectHealthRoutes = require("./routes/projectHealthRoutes");
const connectDB = require("./config/db");
const { connectMongoDB } = require("./config/mongodb");
const authService = require("./services/authService");
const {
  logger,
  requestLoggerMiddleware,
  errorLoggerMiddleware,
} = require("./utils/logger");

// Load .env from parent directory (root of project)

const app = express();
const server = http.createServer(app);

// Log startup information
logger.info("Starting CodeEcho Backend", {
  nodeVersion: process.version,
  platform: process.platform,
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
});

// Configure CORS origins - allow all Vercel preview URLs and production
const allowedOrigins = process.env.FRONTEND_URL
  ? [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      // Add your Vercel domains
      "https://code-echo-ff2v55hh0-usama-ijazs-projects-12c3c9a3.vercel.app",
      /https:\/\/.*\.vercel\.app$/, // Allow all Vercel preview deployments
    ]
  : ["*"];

logger.info("CORS Configuration", {
  allowedOrigins:
    typeof allowedOrigins === "object"
      ? allowedOrigins.filter((o) => typeof o === "string")
      : allowedOrigins,
});

// CORS origin function to handle both strings and regex
const corsOrigin = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, etc)
  if (!origin) return callback(null, true);

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some((allowed) => {
    if (typeof allowed === "string") {
      return allowed === "*" || allowed === origin;
    } else if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });

  if (isAllowed) {
    callback(null, true);
  } else {
    logger.warn("CORS blocked request", { origin });
    callback(new Error("Not allowed by CORS"));
  }
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// Middleware
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400, // 24 hours
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use(requestLoggerMiddleware(logger));

// Database Connections
// connectDB(); // PostgreSQL - Not used, causing duplicate MongoDB connection
logger.info("Connecting to MongoDB...");
connectMongoDB()
  .then(() => {
    logger.info("MongoDB connected successfully");
    // Initialize default user after MongoDB connection
    return authService.initializeDefaultUser();
  })
  .then(() => {
    logger.info("Default user initialized");
  })
  .catch((error) => {
    logger.error("Database connection or initialization failed", error);
  }); // MongoDB for data management and insights

// Routes
app.use("/api/agents", agentRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/project-health", projectHealthRoutes);

// Health check endpoint for deployment verification
app.get("/", (req, res) => {
  const response = {
    status: "ok",
    message: "CodeEcho Backend API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  };
  logger.debug("Health check requested", response);
  res.json(response);
});

app.get("/health", (req, res) => {
  const response = {
    status: "healthy",
    database: "connected",
    timestamp: new Date().toISOString(),
  };
  logger.debug("Detailed health check requested", response);
  res.json(response);
});

// Socket.IO Connection
io.on("connection", (socket) => {
  logger.info("WebSocket connection established", { socketId: socket.id });

  socket.on("disconnect", () => {
    logger.info("WebSocket connection closed", { socketId: socket.id });
  });

  socket.on("error", (error) => {
    logger.error("WebSocket error", error, { socketId: socket.id });
  });
});

// Make io accessible in routes
app.set("io", io);

// Error handling middleware (must be last)
app.use(errorLoggerMiddleware(logger));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", reason, {
    promise: promise.toString(),
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});
