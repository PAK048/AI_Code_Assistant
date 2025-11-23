const mongoose = require("mongoose");

/**
 * AgentTask Model
 * Tracks all AI agent actions and their outcomes
 * Provides insights into agent effectiveness and usage patterns
 */
const agentTaskSchema = new mongoose.Schema(
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
    taskType: {
      type: String,
      enum: [
        "code_review",
        "refactoring",
        "test_generation",
        "quality_metrics",
        "prediction",
        "code_completion",
        "bug_fix",
        "documentation",
        "optimization",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    input: {
      fileId: { type: String },
      fileName: { type: String },
      language: { type: String },
      code: { type: String },
      prompt: { type: String },
      context: { type: mongoose.Schema.Types.Mixed },
    },
    output: {
      suggestions: [{ type: mongoose.Schema.Types.Mixed }],
      generatedCode: { type: String },
      explanation: { type: String },
      confidence: { type: Number, min: 0, max: 100 },
      metrics: { type: mongoose.Schema.Types.Mixed },
    },
    aiMetadata: {
      model: { type: String, default: "granite-13b-chat-v2" },
      tokensUsed: { type: Number, default: 0 },
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      temperature: { type: Number, default: 0.7 },
      maxTokens: { type: Number },
    },
    performance: {
      startTime: { type: Date, required: true },
      endTime: { type: Date },
      duration: { type: Number }, // in milliseconds
      apiLatency: { type: Number },
    },
    userFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      accepted: { type: Boolean },
      modified: { type: Boolean },
      comment: { type: String },
      submittedAt: { type: Date },
    },
    effectivenessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    error: {
      message: { type: String },
      stack: { type: String },
      code: { type: String },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
agentTaskSchema.index({ sessionId: 1, createdAt: -1 });
agentTaskSchema.index({ userId: 1, createdAt: -1 });
agentTaskSchema.index({ taskType: 1, status: 1 });
agentTaskSchema.index({ "userFeedback.rating": 1 });
agentTaskSchema.index({ effectivenessScore: -1 });
agentTaskSchema.index({ createdAt: -1 });

// Method to calculate effectiveness score
agentTaskSchema.methods.calculateEffectiveness = function () {
  let score = 0;

  // Base score from status
  if (this.status === "completed") score += 40;
  else if (this.status === "in_progress") score += 20;

  // User feedback contribution
  if (this.userFeedback.rating) {
    score += (this.userFeedback.rating / 5) * 30;
  }

  if (this.userFeedback.accepted) score += 20;
  else if (this.userFeedback.modified) score += 10;

  // Performance contribution
  if (this.performance.duration && this.performance.duration < 5000) {
    score += 10;
  } else if (this.performance.duration && this.performance.duration < 10000) {
    score += 5;
  }

  this.effectivenessScore = Math.min(score, 100);
  return this.effectivenessScore;
};

// Static method to get most used task types
agentTaskSchema.statics.getMostUsedTaskTypes = async function (
  userId,
  limit = 5
) {
  return await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$taskType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { taskType: "$_id", count: 1, _id: 0 } },
  ]);
};

// Static method to get average effectiveness by task type
agentTaskSchema.statics.getAverageEffectiveness = async function (
  userId,
  taskType = null
) {
  const match = {
    userId: mongoose.Types.ObjectId(userId),
    status: "completed",
  };
  if (taskType) match.taskType = taskType;

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: taskType ? null : "$taskType",
        avgEffectiveness: { $avg: "$effectivenessScore" },
        count: { $sum: 1 },
      },
    },
  ]);

  return result;
};

// Static method to get task completion rate
agentTaskSchema.statics.getCompletionRate = async function (
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
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const completed = results.find((r) => r._id === "completed")?.count || 0;

  return total > 0 ? ((completed / total) * 100).toFixed(2) : 0;
};

module.exports = mongoose.model("AgentTask", agentTaskSchema);
