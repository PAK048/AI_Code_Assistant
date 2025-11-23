const AgentTask = require("../models/AgentTask");
const Session = require("../models/Session");
const UsageStatistics = require("../models/UsageStatistics");

/**
 * Agent Task Service
 * Manages AI agent task tracking and effectiveness analysis
 */
class AgentTaskService {
  /**
   * Create a new agent task
   */
  async createAgentTask(data) {
    try {
      const { sessionId, userId, taskType, input, aiMetadata } = data;

      const agentTask = new AgentTask({
        sessionId,
        userId,
        taskType,
        status: "pending",
        input,
        aiMetadata,
        performance: {
          startTime: new Date(),
        },
      });

      await agentTask.save();

      // Update session statistics
      await Session.findOneAndUpdate(
        { sessionId },
        {
          $inc: { "statistics.totalAgentTasks": 1 },
          $set: { "statistics.lastActivity": new Date() },
        }
      );

      return agentTask;
    } catch (error) {
      console.error("Error creating agent task:", error);
      throw error;
    }
  }

  /**
   * Update agent task status
   */
  async updateTaskStatus(taskId, status, output = null, error = null) {
    try {
      const updateData = {
        status,
        "performance.endTime": new Date(),
        updatedAt: new Date(),
      };

      if (output) {
        updateData.output = output;
      }

      if (error) {
        updateData.error = error;
      }

      const task = await AgentTask.findByIdAndUpdate(taskId, updateData, {
        new: true,
      });

      if (task) {
        // Calculate duration
        task.performance.duration =
          task.performance.endTime - task.performance.startTime;
        await task.save();

        // Update usage statistics if completed
        if (status === "completed") {
          await this.updateUsageStatistics(
            task.userId,
            task.taskType,
            task.aiMetadata.tokensUsed,
            task.performance.duration
          );
        }
      }

      return task;
    } catch (error) {
      console.error("Error updating task status:", error);
      throw error;
    }
  }

  /**
   * Add user feedback to task
   */
  async addUserFeedback(taskId, feedback) {
    try {
      const { rating, accepted, modified, comment } = feedback;

      const task = await AgentTask.findByIdAndUpdate(
        taskId,
        {
          userFeedback: {
            rating,
            accepted,
            modified,
            comment,
            submittedAt: new Date(),
          },
        },
        { new: true }
      );

      if (task) {
        // Calculate effectiveness score
        task.calculateEffectiveness();
        await task.save();

        // Update command usage with satisfaction rating
        let stats = await UsageStatistics.findOne({ userId: task.userId });
        if (stats) {
          const cmd = stats.commandUsage.find(
            (c) => c.category === this.mapTaskTypeToCategory(task.taskType)
          );
          if (cmd) {
            cmd.userSatisfaction =
              (cmd.userSatisfaction * (cmd.count - 1) + rating) / cmd.count;
            await stats.save();
          }
        }
      }

      return task;
    } catch (error) {
      console.error("Error adding user feedback:", error);
      throw error;
    }
  }

  /**
   * Get agent task by ID
   */
  async getTaskById(taskId) {
    try {
      const task = await AgentTask.findById(taskId);
      return task;
    } catch (error) {
      console.error("Error getting task by ID:", error);
      throw error;
    }
  }

  /**
   * Get tasks for a session
   */
  async getSessionTasks(sessionId, limit = 50, skip = 0) {
    try {
      const tasks = await AgentTask.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return tasks;
    } catch (error) {
      console.error("Error getting session tasks:", error);
      throw error;
    }
  }

  /**
   * Get tasks for a user
   */
  async getUserTasks(userId, filters = {}, limit = 50, skip = 0) {
    try {
      const query = { userId };

      if (filters.taskType) {
        query.taskType = filters.taskType;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
          query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      if (filters.minRating) {
        query["userFeedback.rating"] = { $gte: filters.minRating };
      }

      const tasks = await AgentTask.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return tasks;
    } catch (error) {
      console.error("Error getting user tasks:", error);
      throw error;
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(userId, timeRange = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Get completion rate
      const completionRate = await AgentTask.getCompletionRate(
        userId,
        timeRange
      );

      // Get most used task types
      const mostUsed = await AgentTask.getMostUsedTaskTypes(userId, 5);

      // Get average effectiveness
      const avgEffectiveness = await AgentTask.getAverageEffectiveness(userId);

      // Get stats by status
      const statusStats = await AgentTask.aggregate([
        {
          $match: {
            userId,
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

      // Get average performance
      const perfStats = await AgentTask.aggregate([
        {
          $match: {
            userId,
            status: "completed",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$performance.duration" },
            avgTokens: { $avg: "$aiMetadata.tokensUsed" },
            avgEffectiveness: { $avg: "$effectivenessScore" },
          },
        },
      ]);

      return {
        completionRate: parseFloat(completionRate),
        mostUsedTaskTypes: mostUsed,
        avgEffectiveness: avgEffectiveness,
        byStatus: statusStats,
        performance: perfStats[0] || {
          avgDuration: 0,
          avgTokens: 0,
          avgEffectiveness: 0,
        },
      };
    } catch (error) {
      console.error("Error getting task statistics:", error);
      throw error;
    }
  }

  /**
   * Get task effectiveness by type
   */
  async getTaskEffectivenessByType(userId) {
    try {
      const effectiveness = await AgentTask.aggregate([
        {
          $match: {
            userId,
            status: "completed",
          },
        },
        {
          $group: {
            _id: "$taskType",
            avgEffectiveness: { $avg: "$effectivenessScore" },
            count: { $sum: 1 },
            acceptedCount: {
              $sum: { $cond: ["$userFeedback.accepted", 1, 0] },
            },
            avgRating: { $avg: "$userFeedback.rating" },
          },
        },
        { $sort: { avgEffectiveness: -1 } },
      ]);

      return effectiveness;
    } catch (error) {
      console.error("Error getting task effectiveness by type:", error);
      throw error;
    }
  }

  /**
   * Get task timeline
   */
  async getTaskTimeline(userId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const timeline = await AgentTask.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              taskType: "$taskType",
            },
            count: { $sum: 1 },
            avgEffectiveness: { $avg: "$effectivenessScore" },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]);

      return timeline;
    } catch (error) {
      console.error("Error getting task timeline:", error);
      throw error;
    }
  }

  /**
   * Update usage statistics
   */
  async updateUsageStatistics(userId, taskType, tokensUsed, duration) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = new UsageStatistics({ userId });
        await stats.save();
      }

      // Map task type to feature usage
      const featureMap = {
        code_review: "codeReview",
        refactoring: "refactoring",
        test_generation: "testGeneration",
        quality_metrics: "qualityMetrics",
        prediction: "prediction",
      };

      const feature = featureMap[taskType];
      if (feature) {
        await UsageStatistics.findOneAndUpdate(
          { userId },
          { $inc: { [`featureUsage.${feature}`]: 1 } }
        );
      }

      // Update AI usage
      await stats.updateAIUsage(
        "granite-13b-chat-v2",
        taskType,
        tokensUsed,
        duration,
        true
      );

      // Update command usage
      const category = this.mapTaskTypeToCategory(taskType);
      await stats.incrementCommand(taskType, category, duration, true);
    } catch (error) {
      console.error("Error updating usage statistics:", error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Map task type to category
   */
  mapTaskTypeToCategory(taskType) {
    const categoryMap = {
      code_review: "code_review",
      refactoring: "refactoring",
      test_generation: "testing",
      quality_metrics: "prediction",
      prediction: "prediction",
      code_completion: "chat",
      bug_fix: "refactoring",
      documentation: "chat",
      optimization: "refactoring",
    };

    return categoryMap[taskType] || "chat";
  }

  /**
   * Delete old tasks
   */
  async deleteOldTasks(userId, olderThan = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThan);

      const result = await AgentTask.deleteMany({
        userId,
        createdAt: { $lt: cutoffDate },
      });

      return result.deletedCount;
    } catch (error) {
      console.error("Error deleting old tasks:", error);
      throw error;
    }
  }
}

module.exports = new AgentTaskService();
