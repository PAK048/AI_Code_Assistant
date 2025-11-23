const mongoose = require("mongoose");

/**
 * User Model
 * Manages single user account, authentication, and profile information
 * Note: Single-user application, but designed for potential multi-user expansion
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profile: {
      fullName: { type: String, default: "" },
      avatar: { type: String, default: "" },
      bio: { type: String, default: "" },
      preferredLanguage: { type: String, default: "javascript" },
      theme: { type: String, enum: ["light", "dark", "auto"], default: "dark" },
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      autoSave: { type: Boolean, default: true },
      aiAssistance: { type: Boolean, default: true },
      codeCompletionEnabled: { type: Boolean, default: true },
    },
    statistics: {
      totalSessions: { type: Number, default: 0 },
      totalChats: { type: Number, default: 0 },
      totalExecutions: { type: Number, default: 0 },
      totalFilesUploaded: { type: Number, default: 0 },
      totalCodeReviews: { type: Number, default: 0 },
      totalRefactorings: { type: Number, default: 0 },
      totalTestsGenerated: { type: Number, default: 0 },
    },
    lastLogin: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for active sessions count (populated from Session model)
userSchema.virtual("activeSessions", {
  ref: "Session",
  localField: "_id",
  foreignField: "userId",
  count: true,
});

module.exports = mongoose.model("User", userSchema);
