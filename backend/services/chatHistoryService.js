const ChatHistory = require("../models/ChatHistory");
const Session = require("../models/Session");

/**
 * Chat History Service
 * Manages chat message storage and retrieval
 */
class ChatHistoryService {
  /**
   * Create a new chat history for a session
   */
  async createChatHistory(sessionId, userId) {
    try {
      const chatHistory = new ChatHistory({
        sessionId,
        userId,
        messages: [],
      });

      await chatHistory.save();
      return chatHistory;
    } catch (error) {
      console.error("Error creating chat history:", error);
      throw error;
    }
  }

  /**
   * Add a message to chat history
   */
  async addMessage(sessionId, role, content, metadata = {}) {
    try {
      let chatHistory = await ChatHistory.findOne({ sessionId });

      if (!chatHistory) {
        // Get userId from session
        const session = await Session.findOne({ sessionId });
        if (!session) {
          throw new Error("Session not found");
        }
        chatHistory = await this.createChatHistory(sessionId, session.userId);
      }

      await chatHistory.addMessage(role, content, metadata);

      // Update session statistics
      await Session.findOneAndUpdate(
        { sessionId },
        {
          $inc: { "statistics.totalMessages": 1 },
          $set: { "statistics.lastActivity": new Date() },
        }
      );

      return chatHistory;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId, limit = null) {
    try {
      const chatHistory = await ChatHistory.findOne({ sessionId });

      if (!chatHistory) {
        return null;
      }

      if (limit) {
        return {
          ...chatHistory.toObject(),
          messages: chatHistory.getRecentMessages(limit),
        };
      }

      return chatHistory;
    } catch (error) {
      console.error("Error getting chat history:", error);
      throw error;
    }
  }

  /**
   * Get all chat histories for a user
   */
  async getUserChatHistories(userId, limit = 10, skip = 0) {
    try {
      const chatHistories = await ChatHistory.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate("sessionId", "name description startedAt");

      return chatHistories;
    } catch (error) {
      console.error("Error getting user chat histories:", error);
      throw error;
    }
  }

  /**
   * Search messages in chat history
   */
  async searchMessages(userId, query, limit = 50) {
    try {
      const chatHistories = await ChatHistory.find({
        userId,
        "messages.content": { $regex: query, $options: "i" },
      })
        .sort({ updatedAt: -1 })
        .limit(limit);

      // Filter messages that match the query
      const results = [];
      chatHistories.forEach((chat) => {
        const matchingMessages = chat.messages.filter((msg) =>
          msg.content.toLowerCase().includes(query.toLowerCase())
        );

        if (matchingMessages.length > 0) {
          results.push({
            sessionId: chat.sessionId,
            messages: matchingMessages,
          });
        }
      });

      return results;
    } catch (error) {
      console.error("Error searching messages:", error);
      throw error;
    }
  }

  /**
   * Get chat statistics
   */
  async getChatStatistics(userId, timeRange = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const stats = await ChatHistory.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: "$summary.totalMessages" },
            totalTokens: { $sum: "$summary.totalTokens" },
            avgResponseTime: { $avg: "$summary.avgResponseTime" },
          },
        },
      ]);

      return (
        stats[0] || {
          totalChats: 0,
          totalMessages: 0,
          totalTokens: 0,
          avgResponseTime: 0,
        }
      );
    } catch (error) {
      console.error("Error getting chat statistics:", error);
      throw error;
    }
  }

  /**
   * Delete chat history
   */
  async deleteChatHistory(sessionId) {
    try {
      await ChatHistory.deleteOne({ sessionId });
      return true;
    } catch (error) {
      console.error("Error deleting chat history:", error);
      throw error;
    }
  }

  /**
   * Get messages by action type
   */
  async getMessagesByActionType(userId, actionType, limit = 20) {
    try {
      const chatHistories = await ChatHistory.find({
        userId,
        "messages.metadata.actionType": actionType,
      })
        .sort({ updatedAt: -1 })
        .limit(limit);

      const results = [];
      chatHistories.forEach((chat) => {
        const filteredMessages = chat.messages.filter(
          (msg) => msg.metadata?.actionType === actionType
        );

        if (filteredMessages.length > 0) {
          results.push({
            sessionId: chat.sessionId,
            messages: filteredMessages,
          });
        }
      });

      return results;
    } catch (error) {
      console.error("Error getting messages by action type:", error);
      throw error;
    }
  }
}

module.exports = new ChatHistoryService();
