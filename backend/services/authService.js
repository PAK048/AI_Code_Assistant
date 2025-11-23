const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Authentication Service
 * Simple authentication for single-user application
 * Manages user account, sessions, and JWT tokens
 */
class AuthService {
  constructor() {
    this.JWT_SECRET =
      process.env.JWT_SECRET || "codeecho-secret-key-change-in-production";
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
  }

  /**
   * Initialize default user (for single-user setup)
   */
  async initializeDefaultUser() {
    try {
      const existingUser = await User.findOne();

      if (!existingUser) {
        const defaultUsername = process.env.DEFAULT_USERNAME || "developer";
        const defaultEmail =
          process.env.DEFAULT_EMAIL || "developer@codeecho.local";
        const defaultPassword = process.env.DEFAULT_PASSWORD || "codeecho123";

        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const user = new User({
          username: defaultUsername,
          email: defaultEmail,
          passwordHash,
          profile: {
            fullName: "Developer",
            preferredLanguage: "javascript",
            theme: "dark",
          },
        });

        await user.save();
        console.log("Default user created successfully");
        console.log(`Username: ${defaultUsername}`);
        console.log(`Email: ${defaultEmail}`);
        console.log(`Password: ${defaultPassword}`);

        return user;
      }

      return existingUser;
    } catch (error) {
      console.error("Error initializing default user:", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(username, password) {
    try {
      const user = await User.findOne({
        $or: [{ username }, { email: username }],
      });

      if (!user) {
        throw new Error("Invalid credentials");
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          statistics: user.statistics,
        },
        token,
      };
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  /**
   * Auto-login (for single-user setup)
   */
  async autoLogin() {
    try {
      // Get the single user
      let user = await User.findOne();

      if (!user) {
        // Initialize default user if none exists
        user = await this.initializeDefaultUser();
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          statistics: user.statistics,
        },
        token,
      };
    } catch (error) {
      console.error("Error auto-logging in:", error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        statistics: user.statistics,
        lastLogin: user.lastLogin,
      };
    } catch (error) {
      console.error("Error getting current user:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          profile: profileData,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
      };
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId, preferences) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          preferences,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!user) {
        throw new Error("User not found");
      }

      return user.preferences;
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStatistics(userId, statisticsUpdate) {
    try {
      const updateFields = {};

      Object.keys(statisticsUpdate).forEach((key) => {
        updateFields[`statistics.${key}`] = statisticsUpdate[key];
      });

      await User.findByIdAndUpdate(userId, { $inc: updateFields });

      return true;
    } catch (error) {
      console.error("Error updating user statistics:", error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = newPasswordHash;
      user.updatedAt = new Date();
      await user.save();

      return true;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user._id,
      username: user.username,
      email: user.email,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRY,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Middleware to authenticate requests
   */
  authenticateRequest(req, res, next) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const decoded = this.verifyToken(token);
      req.userId = decoded.userId;
      req.user = decoded;

      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  /**
   * Optional authentication (doesn't fail if no token)
   */
  optionalAuth(req, res, next) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (token) {
        const decoded = this.verifyToken(token);
        req.userId = decoded.userId;
        req.user = decoded;
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  }
}

const authServiceInstance = new AuthService();

// Export both the instance and the middleware function
module.exports = authServiceInstance;
module.exports.authenticate =
  authServiceInstance.authenticateRequest.bind(authServiceInstance);
module.exports.optionalAuth =
  authServiceInstance.optionalAuth.bind(authServiceInstance);
