const Session = require("../models/Session");
const { v4: uuidv4 } = require("uuid");

/**
 * Session Service
 * Manages user sessions and their lifecycle
 */
class SessionService {
  /**
   * Create a new session
   */
  async createSession(userId, sessionData = {}) {
    try {
      const {
        name = "Untitled Session",
        description = "",
        source = "web",
        context = {},
      } = sessionData;

      const session = new Session({
        userId,
        sessionId: uuidv4(),
        name,
        description,
        source,
        context,
        status: "active",
      });

      await session.save();

      return session;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId) {
    try {
      const session = await Session.findOne({ sessionId });
      return session;
    } catch (error) {
      console.error("Error getting session by ID:", error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId, filters = {}, limit = 20, skip = 0) {
    try {
      const query = { userId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.source) {
        query.source = filters.source;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
          query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const sessions = await Session.find(query)
        .sort({ lastAccessedAt: -1 })
        .limit(limit)
        .skip(skip);

      return sessions;
    } catch (error) {
      console.error("Error getting user sessions:", error);
      throw error;
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userId) {
    try {
      const sessions = await Session.getActiveSessions(userId);
      return sessions;
    } catch (error) {
      console.error("Error getting active sessions:", error);
      throw error;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId, updateData) {
    try {
      const session = await Session.findOneAndUpdate(
        { sessionId },
        {
          ...updateData,
          lastAccessedAt: new Date(),
        },
        { new: true }
      );

      return session;
    } catch (error) {
      console.error("Error updating session:", error);
      throw error;
    }
  }

  /**
   * Add file to session
   */
  async addFile(sessionId, fileData) {
    try {
      const session = await Session.findOne({ sessionId });

      if (!session) {
        throw new Error("Session not found");
      }

      await session.addFile(fileData);
      return session;
    } catch (error) {
      console.error("Error adding file to session:", error);
      throw error;
    }
  }

  /**
   * Remove file from session
   */
  async removeFile(sessionId, fileId) {
    try {
      const session = await Session.findOne({ sessionId });

      if (!session) {
        throw new Error("Session not found");
      }

      await session.removeFile(fileId);
      return session;
    } catch (error) {
      console.error("Error removing file from session:", error);
      throw error;
    }
  }

  /**
   * Update session context
   */
  async updateContext(sessionId, context) {
    try {
      const session = await Session.findOneAndUpdate(
        { sessionId },
        {
          context,
          lastAccessedAt: new Date(),
        },
        { new: true }
      );

      return session;
    } catch (error) {
      console.error("Error updating session context:", error);
      throw error;
    }
  }

  /**
   * Add recent action to session
   */
  async addRecentAction(sessionId, action, fileId = null) {
    try {
      const session = await Session.findOne({ sessionId });

      if (!session) {
        throw new Error("Session not found");
      }

      session.context.recentActions.push({
        action,
        timestamp: new Date(),
        fileId,
      });

      // Keep only last 50 actions
      if (session.context.recentActions.length > 50) {
        session.context.recentActions =
          session.context.recentActions.slice(-50);
      }

      session.statistics.lastActivity = new Date();
      await session.save();

      return session;
    } catch (error) {
      console.error("Error adding recent action:", error);
      throw error;
    }
  }

  /**
   * End session
   */
  async endSession(sessionId) {
    try {
      const session = await Session.findOne({ sessionId });

      if (!session) {
        throw new Error("Session not found");
      }

      await session.endSession();
      return session;
    } catch (error) {
      console.error("Error ending session:", error);
      throw error;
    }
  }

  /**
   * Archive session
   */
  async archiveSession(sessionId) {
    try {
      const session = await Session.findOneAndUpdate(
        { sessionId },
        { status: "archived" },
        { new: true }
      );

      return session;
    } catch (error) {
      console.error("Error archiving session:", error);
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    try {
      await Session.deleteOne({ sessionId });
      return true;
    } catch (error) {
      console.error("Error deleting session:", error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(userId, timeRange = 30) {
    try {
      const summary = await Session.getSessionSummary(userId, timeRange);
      return (
        summary[0] || {
          totalSessions: 0,
          activeSessions: 0,
          totalMessages: 0,
          totalExecutions: 0,
          totalAgentTasks: 0,
          avgDuration: 0,
        }
      );
    } catch (error) {
      console.error("Error getting session statistics:", error);
      throw error;
    }
  }

  /**
   * Get session duration breakdown
   */
  async getSessionDurationBreakdown(userId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const breakdown = await Session.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
            totalDuration: { $sum: "$statistics.duration" },
            avgDuration: { $avg: "$statistics.duration" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return breakdown;
    } catch (error) {
      console.error("Error getting session duration breakdown:", error);
      throw error;
    }
  }

  /**
   * Get session activity heatmap
   */
  async getSessionActivityHeatmap(userId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const heatmap = await Session.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              hour: { $hour: "$createdAt" },
              dayOfWeek: { $dayOfWeek: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.dayOfWeek": 1, "_id.hour": 1 } },
      ]);

      return heatmap;
    } catch (error) {
      console.error("Error getting session activity heatmap:", error);
      throw error;
    }
  }

  /**
   * Cleanup inactive sessions
   */
  async cleanupInactiveSessions(userId, inactiveDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

      const result = await Session.updateMany(
        {
          userId,
          status: "active",
          lastAccessedAt: { $lt: cutoffDate },
        },
        { status: "archived" }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error("Error cleaning up inactive sessions:", error);
      throw error;
    }
  }
}

module.exports = new SessionService();
