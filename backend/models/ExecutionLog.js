const mongoose = require("mongoose");

/**
 * ExecutionLog Model
 * Tracks all code executions, test runs, and their results
 * Provides debugging and performance insights
 */
const executionLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    executionType: {
      type: String,
      enum: ["code_run", "test_run", "lint", "format", "build"],
      required: true,
      index: true,
    },
    command: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    environment: {
      runtime: { type: String }, // e.g., "node v18.0.0", "python 3.9"
      dependencies: [{ type: String }],
      workingDirectory: { type: String },
    },
    result: {
      status: {
        type: String,
        enum: ["success", "error", "timeout", "cancelled"],
        required: true,
        index: true,
      },
      exitCode: { type: Number },
      stdout: { type: String },
      stderr: { type: String },
      error: {
        message: { type: String },
        stack: { type: String },
        type: { type: String },
      },
    },
    performance: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      duration: { type: Number, required: true }, // in milliseconds
      memoryUsage: { type: Number }, // in MB
      cpuUsage: { type: Number }, // percentage
    },
    testResults: {
      total: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      coverage: { type: Number, default: 0 }, // percentage
      details: [
        {
          name: { type: String },
          status: { type: String, enum: ["passed", "failed", "skipped"] },
          duration: { type: Number },
          error: { type: String },
        },
      ],
    },
    metadata: {
      triggeredBy: {
        type: String,
        enum: ["user", "auto", "agent"],
        default: "user",
      },
      sourceAction: { type: String }, // e.g., "Generate Tests", "Run Tests"
      retryCount: { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient queries
executionLogSchema.index({ sessionId: 1, createdAt: -1 });
executionLogSchema.index({ userId: 1, createdAt: -1 });
executionLogSchema.index({ fileId: 1, createdAt: -1 });
executionLogSchema.index({ executionType: 1, "result.status": 1 });
executionLogSchema.index({ "performance.duration": 1 });
executionLogSchema.index({ createdAt: -1 });

// Static method to get success rate
executionLogSchema.statics.getSuccessRate = async function (
  userId,
  timeRange = 7
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const results = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$result.status",
        count: { $sum: 1 },
      },
    },
  ]);

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const successful = results.find((r) => r._id === "success")?.count || 0;

  return total > 0 ? ((successful / total) * 100).toFixed(2) : 0;
};

// Static method to get average execution time
executionLogSchema.statics.getAverageExecutionTime = async function (
  userId,
  executionType = null
) {
  const match = { userId: mongoose.Types.ObjectId(userId) };
  if (executionType) match.executionType = executionType;

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: "$performance.duration" },
      },
    },
  ]);

  return result[0]?.avgDuration || 0;
};

module.exports = mongoose.model("ExecutionLog", executionLogSchema);
