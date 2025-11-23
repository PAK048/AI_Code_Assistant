// Load environment variables FIRST before any other requires
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

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

// Load .env from parent directory (root of project)

const app = express();
const server = http.createServer(app);

// Configure CORS origins
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"]
  : ["*"];

console.log("Allowed CORS origins:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Database Connections
// connectDB(); // PostgreSQL - Not used, causing duplicate MongoDB connection
connectMongoDB().then(() => {
  // Initialize default user after MongoDB connection
  authService.initializeDefaultUser().catch(console.error);
}); // MongoDB for data management and insights

// Routes
app.use("/api/agents", agentRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/project-health", projectHealthRoutes);

// Health check endpoint for deployment verification
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "CodeEcho Backend API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO Connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io accessible in routes
app.set("io", io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
