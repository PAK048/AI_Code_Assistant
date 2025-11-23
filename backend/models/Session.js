const mongoose = require("mongoose");

/**
 * Session Model
 * Manages user sessions and metadata
 * Tracks session lifecycle and associated data
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "Untitled Session",
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "archived"],
      default: "active",
      index: true,
    },
    source: {
      type: String,
      enum: ["web", "ide_plugin", "api"],
      default: "web",
      index: true,
    },
    context: {
      projectPath: { type: String },
      workspaceRoot: { type: String },
      activeFile: { type: String },
      openFiles: [{ type: String }],
      recentActions: [
        {
          action: { type: String },
          timestamp: { type: Date },
          fileId: { type: String },
        },
      ],
    },
    files: [
      {
        fileId: { type: String, required: true },
        filePath: { type: String, required: true },
        fileName: { type: String, required: true },
        language: { type: String },
        size: { type: Number },
        lastModified: { type: Date, default: Date.now },
        isDirty: { type: Boolean, default: false },
      },
    ],
    statistics: {
      totalMessages: { type: Number, default: 0 },
      totalExecutions: { type: Number, default: 0 },
      totalAgentTasks: { type: Number, default: 0 },
      filesModified: { type: Number, default: 0 },
      duration: { type: Number, default: 0 }, // in milliseconds
      lastActivity: { type: Date, default: Date.now },
    },
    preferences: {
      autoSave: { type: Boolean, default: true },
      theme: { type: String, default: "dark" },
      fontSize: { type: Number, default: 14 },
      tabSize: { type: Number, default: 2 },
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    lastAccessedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
sessionSchema.index({ userId: 1, status: 1, lastAccessedAt: -1 });
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ status: 1, lastAccessedAt: -1 });
sessionSchema.index({ source: 1 });
sessionSchema.index({ createdAt: -1 });

// Method to add file to session
sessionSchema.methods.addFile = function (fileData) {
  const existingFile = this.files.find((f) => f.fileId === fileData.fileId);

  if (existingFile) {
    // Update existing file
    Object.assign(existingFile, fileData);
  } else {
    // Add new file
    this.files.push(fileData);
  }

  this.statistics.lastActivity = new Date();
  return this.save();
};

// Method to remove file from session
sessionSchema.methods.removeFile = function (fileId) {
  this.files = this.files.filter((f) => f.fileId !== fileId);
  this.statistics.lastActivity = new Date();
  return this.save();
};

// Method to update session duration
sessionSchema.methods.updateDuration = function () {
  if (this.startedAt) {
    const now = new Date();
    this.statistics.duration = now - this.startedAt;
  }
  return this.save();
};

// Method to end session
sessionSchema.methods.endSession = function () {
  this.status = "completed";
  this.endedAt = new Date();
  this.updateDuration();
  return this.save();
};

// Static method to get active sessions
sessionSchema.statics.getActiveSessions = async function (userId) {
  return await this.find({
    userId: mongoose.Types.ObjectId(userId),
    status: "active",
  }).sort({ lastAccessedAt: -1 });
};

// Static method to get session summary
sessionSchema.statics.getSessionSummary = async function (
  userId,
  timeRange = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  return await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        totalMessages: { $sum: "$statistics.totalMessages" },
        totalExecutions: { $sum: "$statistics.totalExecutions" },
        totalAgentTasks: { $sum: "$statistics.totalAgentTasks" },
        avgDuration: { $avg: "$statistics.duration" },
      },
    },
  ]);
};

module.exports = mongoose.model("Session", sessionSchema);
