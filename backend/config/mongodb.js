const mongoose = require("mongoose");

/**
 * MongoDB Configuration and Connection
 * Handles MongoDB connection with retry logic and error handling
 */

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/codeecho";

console.log(
  "MongoDB: MONGODB_URI from env:",
  MONGODB_URI.substring(0, 50) + "..."
);

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
};

// Connection retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

let isConnected = false;
let connectionAttempts = 0;

/**
 * Connect to MongoDB with retry logic
 */
const connectMongoDB = async () => {
  if (isConnected) {
    console.log("MongoDB: Already connected");
    return mongoose.connection;
  }

  try {
    console.log(`MongoDB: Attempting to connect to ${MONGODB_URI}...`);

    await mongoose.connect(MONGODB_URI, mongoOptions);

    isConnected = true;
    connectionAttempts = 0;

    console.log("MongoDB: Connected successfully");
    return mongoose.connection;
  } catch (error) {
    connectionAttempts++;
    console.error(
      `MongoDB: Connection failed (attempt ${connectionAttempts}/${MAX_RETRIES}):`,
      error.message
    );

    if (connectionAttempts < MAX_RETRIES) {
      console.log(`MongoDB: Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return connectMongoDB();
    } else {
      console.error("MongoDB: Max connection attempts reached. Giving up.");
      throw new Error("Failed to connect to MongoDB after multiple attempts");
    }
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectMongoDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("MongoDB: Disconnected successfully");
  } catch (error) {
    console.error("MongoDB: Disconnection error:", error.message);
    throw error;
  }
};

/**
 * Get connection status
 */
const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
};

// MongoDB connection event handlers
mongoose.connection.on("connected", () => {
  console.log("MongoDB: Event - Connected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB: Event - Error:", err.message);
  isConnected = false;
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB: Event - Disconnected");
  isConnected = false;
});

// Handle application termination
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB: Connection closed due to application termination");
    process.exit(0);
  } catch (error) {
    console.error("MongoDB: Error closing connection:", error.message);
    process.exit(1);
  }
});

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  getConnectionStatus,
  mongoose,
};
