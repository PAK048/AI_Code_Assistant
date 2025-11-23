const ExecutionLog = require("../models/ExecutionLog");
const Session = require("../models/Session");
const UsageStatistics = require("../models/UsageStatistics");

/**
 * Execution Log Service
 * Manages code execution logging and analysis
 */
class ExecutionLogService {
  /**
   * Create a new execution log
   */
  async createExecutionLog(data) {
    try {
      const {
        sessionId,
        userId,
        fileId,
        fileName,
        language,
        executionType,
        command,
        code,
        environment,
        result,
        performance,
        testResults,
        metadata,
      } = data;

      const executionLog = new ExecutionLog({
        sessionId,
        userId,
        fileId,
        fileName,
        language,
        executionType,
        command,
        code,
        environment,
        result,
        performance,
        testResults,
        metadata,
      });

      await executionLog.save();

      // Update session statistics
      await Session.findOneAndUpdate(
        { sessionId },
        {
          $inc: { "statistics.totalExecutions": 1 },
          $set: { "statistics.lastActivity": new Date() },
        }
      );

      // Update usage statistics
      await this.updateUsageStatistics(
        userId,
        executionType,
        performance.duration,
        result.status === "success"
      );

      return executionLog;
    } catch (error) {
      console.error("Error creating execution log:", error);
      throw error;
    }
  }

  /**
   * Get execution logs for a session
   */
  async getSessionExecutionLogs(sessionId, limit = 50, skip = 0) {
    try {
      const logs = await ExecutionLog.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return logs;
    } catch (error) {
      console.error("Error getting session execution logs:", error);
      throw error;
    }
  }

  /**
   * Get execution logs for a user
   */
  async getUserExecutionLogs(userId, filters = {}, limit = 50, skip = 0) {
    try {
      const query = { userId };

      if (filters.executionType) {
        query.executionType = filters.executionType;
      }

      if (filters.status) {
        query["result.status"] = filters.status;
      }

      if (filters.language) {
        query.language = filters.language;
      }

      if (filters.fileId) {
        query.fileId = filters.fileId;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
          query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const logs = await ExecutionLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return logs;
    } catch (error) {
      console.error("Error getting user execution logs:", error);
      throw error;
    }
  }

  /**
   * Get execution log by ID
   */
  async getExecutionLogById(logId) {
    try {
      const log = await ExecutionLog.findById(logId);
      return log;
    } catch (error) {
      console.error("Error getting execution log by ID:", error);
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStatistics(userId, timeRange = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const stats = await ExecutionLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$result.status",
            count: { $sum: 1 },
            avgDuration: { $avg: "$performance.duration" },
          },
        },
      ]);

      // Get total and success rate
      const total = stats.reduce((sum, s) => sum + s.count, 0);
      const successful = stats.find((s) => s._id === "success")?.count || 0;
      const successRate =
        total > 0 ? ((successful / total) * 100).toFixed(2) : 0;

      // Get stats by execution type
      const typeStats = await ExecutionLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$executionType",
            count: { $sum: 1 },
            avgDuration: { $avg: "$performance.duration" },
          },
        },
      ]);

      return {
        total,
        successRate,
        byStatus: stats,
        byType: typeStats,
        avgDuration:
          stats.reduce((sum, s) => sum + s.avgDuration * s.count, 0) / total ||
          0,
      };
    } catch (error) {
      console.error("Error getting execution statistics:", error);
      throw error;
    }
  }

  /**
   * Get failed executions
   */
  async getFailedExecutions(userId, limit = 20) {
    try {
      const logs = await ExecutionLog.find({
        userId,
        "result.status": { $in: ["error", "timeout"] },
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      return logs;
    } catch (error) {
      console.error("Error getting failed executions:", error);
      throw error;
    }
  }

  /**
   * Get test execution summary
   */
  async getTestExecutionSummary(userId, timeRange = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const summary = await ExecutionLog.aggregate([
        {
          $match: {
            userId,
            executionType: "test_run",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: 1 },
            totalTests: { $sum: "$testResults.total" },
            totalPassed: { $sum: "$testResults.passed" },
            totalFailed: { $sum: "$testResults.failed" },
            totalSkipped: { $sum: "$testResults.skipped" },
            avgCoverage: { $avg: "$testResults.coverage" },
          },
        },
      ]);

      return (
        summary[0] || {
          totalRuns: 0,
          totalTests: 0,
          totalPassed: 0,
          totalFailed: 0,
          totalSkipped: 0,
          avgCoverage: 0,
        }
      );
    } catch (error) {
      console.error("Error getting test execution summary:", error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(userId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const metrics = await ExecutionLog.aggregate([
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
            avgDuration: { $avg: "$performance.duration" },
            successCount: {
              $sum: { $cond: [{ $eq: ["$result.status", "success"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return metrics;
    } catch (error) {
      console.error("Error getting performance metrics:", error);
      throw error;
    }
  }

  /**
   * Update usage statistics
   */
  async updateUsageStatistics(userId, executionType, duration, success) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = new UsageStatistics({ userId });
        await stats.save();
      }

      // Increment feature usage
      await UsageStatistics.findOneAndUpdate(
        { userId },
        {
          $inc: {
            "featureUsage.codeExecution": 1,
            "productivity.totalExecutions": 1,
          },
        }
      );

      // Update command usage
      const command = `execute_${executionType}`;
      await stats.incrementCommand(command, "execution", duration, success);

      // Update effectiveness
      const totalExecs = await ExecutionLog.countDocuments({ userId });
      const successfulExecs = await ExecutionLog.countDocuments({
        userId,
        "result.status": "success",
      });
      const successRate =
        totalExecs > 0 ? (successfulExecs / totalExecs) * 100 : 0;

      await UsageStatistics.findOneAndUpdate(
        { userId },
        { $set: { "effectiveness.executionSuccessRate": successRate } }
      );
    } catch (error) {
      console.error("Error updating usage statistics:", error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Delete execution logs
   */
  async deleteExecutionLogs(userId, olderThan = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThan);

      const result = await ExecutionLog.deleteMany({
        userId,
        createdAt: { $lt: cutoffDate },
      });

      return result.deletedCount;
    } catch (error) {
      console.error("Error deleting execution logs:", error);
      throw error;
    }
  }
}

module.exports = new ExecutionLogService();
