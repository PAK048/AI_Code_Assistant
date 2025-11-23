const mongoose = require("mongoose");

/**
 * UsageStatistics Model
 * Tracks AI usage statistics, command effectiveness, and user insights
 * Provides analytics for most used features and AI performance
 */
const usageStatisticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // Command usage tracking
    commandUsage: [
      {
        command: { type: String, required: true },
        category: {
          type: String,
          enum: [
            "code_review",
            "refactoring",
            "testing",
            "prediction",
            "chat",
            "execution",
            "file_management",
          ],
        },
        count: { type: Number, default: 0 },
        lastUsed: { type: Date, default: Date.now },
        avgExecutionTime: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 },
        userSatisfaction: { type: Number, default: 0 }, // 0-5 rating
      },
    ],
    // AI model usage
    aiModelUsage: {
      totalRequests: { type: Number, default: 0 },
      totalTokensUsed: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      byModel: [
        {
          model: { type: String },
          requests: { type: Number, default: 0 },
          tokensUsed: { type: Number, default: 0 },
          avgLatency: { type: Number, default: 0 },
          successRate: { type: Number, default: 0 },
        },
      ],
      byTaskType: [
        {
          taskType: { type: String },
          requests: { type: Number, default: 0 },
          tokensUsed: { type: Number, default: 0 },
          avgEffectiveness: { type: Number, default: 0 },
        },
      ],
    },
    // Feature usage
    featureUsage: {
      codeReview: { type: Number, default: 0 },
      refactoring: { type: Number, default: 0 },
      testGeneration: { type: Number, default: 0 },
      qualityMetrics: { type: Number, default: 0 },
      prediction: { type: Number, default: 0 },
      codeExecution: { type: Number, default: 0 },
      fileManagement: { type: Number, default: 0 },
    },
    // Time-based analytics
    analytics: {
      daily: [
        {
          date: { type: Date },
          sessions: { type: Number, default: 0 },
          messages: { type: Number, default: 0 },
          executions: { type: Number, default: 0 },
          agentTasks: { type: Number, default: 0 },
          activeTime: { type: Number, default: 0 }, // in milliseconds
        },
      ],
      weekly: [
        {
          weekStart: { type: Date },
          sessions: { type: Number, default: 0 },
          messages: { type: Number, default: 0 },
          executions: { type: Number, default: 0 },
          agentTasks: { type: Number, default: 0 },
        },
      ],
      monthly: [
        {
          month: { type: Date },
          sessions: { type: Number, default: 0 },
          messages: { type: Number, default: 0 },
          executions: { type: Number, default: 0 },
          agentTasks: { type: Number, default: 0 },
        },
      ],
    },
    // Language and framework usage
    languageStats: [
      {
        language: { type: String },
        filesCreated: { type: Number, default: 0 },
        filesEdited: { type: Number, default: 0 },
        linesWritten: { type: Number, default: 0 },
        executionCount: { type: Number, default: 0 },
      },
    ],
    // Productivity metrics
    productivity: {
      totalSessions: { type: Number, default: 0 },
      totalActiveTime: { type: Number, default: 0 },
      avgSessionDuration: { type: Number, default: 0 },
      filesCreated: { type: Number, default: 0 },
      filesModified: { type: Number, default: 0 },
      linesOfCodeWritten: { type: Number, default: 0 },
      testsGenerated: { type: Number, default: 0 },
      bugsFixed: { type: Number, default: 0 },
      codeRefactored: { type: Number, default: 0 },
    },
    // Effectiveness scores
    effectiveness: {
      overallScore: { type: Number, default: 0, min: 0, max: 100 },
      codeQuality: { type: Number, default: 0, min: 0, max: 100 },
      testCoverage: { type: Number, default: 0, min: 0, max: 100 },
      aiAcceptanceRate: { type: Number, default: 0, min: 0, max: 100 },
      executionSuccessRate: { type: Number, default: 0, min: 0, max: 100 },
    },
    // Most used features (cached for quick access)
    topFeatures: [
      {
        feature: { type: String },
        count: { type: Number },
        effectiveness: { type: Number },
      },
    ],
    lastCalculated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes
usageStatisticsSchema.index({ userId: 1 });
usageStatisticsSchema.index({ lastCalculated: 1 });

// Method to increment command usage
usageStatisticsSchema.methods.incrementCommand = function (
  command,
  category,
  executionTime = 0,
  success = true
) {
  let cmd = this.commandUsage.find((c) => c.command === command);

  if (!cmd) {
    cmd = {
      command,
      category,
      count: 0,
      lastUsed: new Date(),
      avgExecutionTime: 0,
      successRate: 100,
    };
    this.commandUsage.push(cmd);
  } else {
    cmd = this.commandUsage.find((c) => c.command === command);
  }

  cmd.count += 1;
  cmd.lastUsed = new Date();
  cmd.avgExecutionTime =
    (cmd.avgExecutionTime * (cmd.count - 1) + executionTime) / cmd.count;

  // Update success rate
  const prevSuccesses = Math.round((cmd.successRate / 100) * (cmd.count - 1));
  const newSuccesses = prevSuccesses + (success ? 1 : 0);
  cmd.successRate = (newSuccesses / cmd.count) * 100;

  return this.save();
};

// Method to update AI usage
usageStatisticsSchema.methods.updateAIUsage = function (
  model,
  taskType,
  tokensUsed,
  latency,
  success = true
) {
  this.aiModelUsage.totalRequests += 1;
  this.aiModelUsage.totalTokensUsed += tokensUsed;

  // Update by model
  let modelStats = this.aiModelUsage.byModel.find((m) => m.model === model);
  if (!modelStats) {
    modelStats = {
      model,
      requests: 0,
      tokensUsed: 0,
      avgLatency: 0,
      successRate: 100,
    };
    this.aiModelUsage.byModel.push(modelStats);
  } else {
    modelStats = this.aiModelUsage.byModel.find((m) => m.model === model);
  }

  modelStats.requests += 1;
  modelStats.tokensUsed += tokensUsed;
  modelStats.avgLatency =
    (modelStats.avgLatency * (modelStats.requests - 1) + latency) /
    modelStats.requests;

  const prevSuccesses = Math.round(
    (modelStats.successRate / 100) * (modelStats.requests - 1)
  );
  const newSuccesses = prevSuccesses + (success ? 1 : 0);
  modelStats.successRate = (newSuccesses / modelStats.requests) * 100;

  // Update by task type
  let taskStats = this.aiModelUsage.byTaskType.find(
    (t) => t.taskType === taskType
  );
  if (!taskStats) {
    taskStats = { taskType, requests: 0, tokensUsed: 0, avgEffectiveness: 0 };
    this.aiModelUsage.byTaskType.push(taskStats);
  } else {
    taskStats = this.aiModelUsage.byTaskType.find(
      (t) => t.taskType === taskType
    );
  }

  taskStats.requests += 1;
  taskStats.tokensUsed += tokensUsed;

  return this.save();
};

// Method to update daily analytics
usageStatisticsSchema.methods.updateDailyAnalytics = function (
  sessions = 0,
  messages = 0,
  executions = 0,
  agentTasks = 0,
  activeTime = 0
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dailyStats = this.analytics.daily.find(
    (d) => d.date.getTime() === today.getTime()
  );

  if (!dailyStats) {
    dailyStats = {
      date: today,
      sessions,
      messages,
      executions,
      agentTasks,
      activeTime,
    };
    this.analytics.daily.push(dailyStats);
  } else {
    dailyStats = this.analytics.daily.find(
      (d) => d.date.getTime() === today.getTime()
    );
    dailyStats.sessions += sessions;
    dailyStats.messages += messages;
    dailyStats.executions += executions;
    dailyStats.agentTasks += agentTasks;
    dailyStats.activeTime += activeTime;
  }

  // Keep only last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  this.analytics.daily = this.analytics.daily.filter(
    (d) => d.date >= ninetyDaysAgo
  );

  return this.save();
};

// Method to calculate top features
usageStatisticsSchema.methods.calculateTopFeatures = function () {
  const features = [
    {
      feature: "Code Review",
      count: this.featureUsage.codeReview,
      category: "code_review",
    },
    {
      feature: "Refactoring",
      count: this.featureUsage.refactoring,
      category: "refactoring",
    },
    {
      feature: "Test Generation",
      count: this.featureUsage.testGeneration,
      category: "testing",
    },
    {
      feature: "Quality Metrics",
      count: this.featureUsage.qualityMetrics,
      category: "prediction",
    },
    {
      feature: "Prediction",
      count: this.featureUsage.prediction,
      category: "prediction",
    },
    {
      feature: "Code Execution",
      count: this.featureUsage.codeExecution,
      category: "execution",
    },
  ];

  // Calculate effectiveness from command usage
  features.forEach((f) => {
    const cmds = this.commandUsage.filter((c) => c.category === f.category);
    if (cmds.length > 0) {
      const avgSatisfaction =
        cmds.reduce((sum, c) => sum + c.userSatisfaction, 0) / cmds.length;
      const avgSuccess =
        cmds.reduce((sum, c) => sum + c.successRate, 0) / cmds.length;
      f.effectiveness = (avgSatisfaction * 20 + avgSuccess) / 2; // Scale satisfaction to 0-100
    } else {
      f.effectiveness = 0;
    }
  });

  this.topFeatures = features.sort((a, b) => b.count - a.count).slice(0, 5);

  return this.save();
};

// Static method to get user insights
usageStatisticsSchema.statics.getUserInsights = async function (userId) {
  const stats = await this.findOne({ userId: mongoose.Types.ObjectId(userId) });

  if (!stats) return null;

  // Calculate insights
  const insights = {
    mostUsedCommands: stats.commandUsage
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => ({
        command: c.command,
        count: c.count,
        successRate: c.successRate,
      })),
    topFeatures: stats.topFeatures,
    totalAIRequests: stats.aiModelUsage.totalRequests,
    totalTokensUsed: stats.aiModelUsage.totalTokensUsed,
    productivity: stats.productivity,
    effectiveness: stats.effectiveness,
    recentActivity: stats.analytics.daily.slice(-7), // Last 7 days
  };

  return insights;
};

module.exports = mongoose.model("UsageStatistics", usageStatisticsSchema);
