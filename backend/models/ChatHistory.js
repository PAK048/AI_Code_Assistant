const mongoose = require("mongoose");

/**
 * ChatHistory Model
 * Stores all chat messages between user and AI agents
 * Supports contextual retrieval and conversation history
 */
const chatHistorySchema = new mongoose.Schema(
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
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant", "system"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          fileId: { type: String },
          fileName: { type: String },
          language: { type: String },
          actionType: {
            type: String,
            enum: [
              "chat",
              "code_review",
              "refactoring",
              "test_generation",
              "prediction",
              "quality_metrics",
            ],
          },
          tokensUsed: { type: Number, default: 0 },
          executionTime: { type: Number, default: 0 }, // in milliseconds
        },
        attachments: [
          {
            type: { type: String, enum: ["file", "code", "image", "document"] },
            name: { type: String },
            content: { type: String },
            size: { type: Number },
          },
        ],
      },
    ],
    context: {
      activeFile: { type: String },
      openFiles: [{ type: String }],
      recentActions: [{ type: String }],
    },
    summary: {
      totalMessages: { type: Number, default: 0 },
      userMessages: { type: Number, default: 0 },
      assistantMessages: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
chatHistorySchema.index({ sessionId: 1, createdAt: -1 });
chatHistorySchema.index({ userId: 1, createdAt: -1 });
chatHistorySchema.index({ "messages.timestamp": -1 });
chatHistorySchema.index({ "messages.metadata.actionType": 1 });

// Method to add a message
chatHistorySchema.methods.addMessage = function (role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata,
  });

  // Update summary
  this.summary.totalMessages = this.messages.length;
  this.summary.userMessages = this.messages.filter(
    (m) => m.role === "user"
  ).length;
  this.summary.assistantMessages = this.messages.filter(
    (m) => m.role === "assistant"
  ).length;
  this.summary.totalTokens += metadata.tokensUsed || 0;

  return this.save();
};

// Method to get recent messages
chatHistorySchema.methods.getRecentMessages = function (limit = 10) {
  return this.messages.slice(-limit);
};

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
