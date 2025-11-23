const UsageStatistics = require("../models/UsageStatistics");
const User = require("../models/User");

/**
 * Usage Statistics Service
 * Manages user insights, AI usage tracking, and effectiveness analytics
 */
class UsageStatisticsService {
  /**
   * Initialize statistics for a user
   */
  async initializeUserStatistics(userId) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = new UsageStatistics({ userId });
        await stats.save();
      }

      return stats;
    } catch (error) {
      console.error("Error initializing user statistics:", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = await this.initializeUserStatistics(userId);
      }

      return stats;
    } catch (error) {
      console.error("Error getting user statistics:", error);
      throw error;
    }
  }

  /**
   * Get user insights
   */
  async getUserInsights(userId) {
    try {
      const insights = await UsageStatistics.getUserInsights(userId);
      return insights;
    } catch (error) {
      console.error("Error getting user insights:", error);
      throw error;
    }
  }

  /**
   * Increment command usage
   */
  async incrementCommand(
    userId,
    command,
    category,
    executionTime = 0,
    success = true
  ) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = await this.initializeUserStatistics(userId);
      }

      await stats.incrementCommand(command, category, executionTime, success);
      return stats;
    } catch (error) {
      console.error("Error incrementing command:", error);
      throw error;
    }
  }

  /**
   * Update AI usage
   */
  async updateAIUsage(
    userId,
    model,
    taskType,
    tokensUsed,
    latency,
    success = true
  ) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = await this.initializeUserStatistics(userId);
      }

      await stats.updateAIUsage(model, taskType, tokensUsed, latency, success);
      return stats;
    } catch (error) {
      console.error("Error updating AI usage:", error);
      throw error;
    }
  }

  /**
   * Update daily analytics
   */
  async updateDailyAnalytics(
    userId,
    sessions = 0,
    messages = 0,
    executions = 0,
    agentTasks = 0,
    activeTime = 0
  ) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = await this.initializeUserStatistics(userId);
      }

      await stats.updateDailyAnalytics(
        sessions,
        messages,
        executions,
        agentTasks,
        activeTime
      );
      return stats;
    } catch (error) {
      console.error("Error updating daily analytics:", error);
      throw error;
    }
  }

  /**
   * Increment feature usage
   */
  async incrementFeatureUsage(userId, feature) {
    try {
      const validFeatures = [
        "codeReview",
        "refactoring",
        "testGeneration",
        "qualityMetrics",
        "prediction",
        "codeExecution",
        "fileManagement",
      ];

      if (!validFeatures.includes(feature)) {
        throw new Error(`Invalid feature: ${feature}`);
      }

      await UsageStatistics.findOneAndUpdate(
        { userId },
        { $inc: { [`featureUsage.${feature}`]: 1 } },
        { upsert: true }
      );

      return true;
    } catch (error) {
      console.error("Error incrementing feature usage:", error);
      throw error;
    }
  }

  /**
   * Update language statistics
   */
  async updateLanguageStats(userId, language, action, linesWritten = 0) {
    try {
      let stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        stats = await this.initializeUserStatistics(userId);
      }

      let langStats = stats.languageStats.find((l) => l.language === language);

      if (!langStats) {
        langStats = {
          language,
          filesCreated: 0,
          filesEdited: 0,
          linesWritten: 0,
          executionCount: 0,
        };
        stats.languageStats.push(langStats);
      } else {
        langStats = stats.languageStats.find((l) => l.language === language);
      }

      switch (action) {
        case "create":
          langStats.filesCreated += 1;
          break;
        case "edit":
          langStats.filesEdited += 1;
          break;
        case "execute":
          langStats.executionCount += 1;
          break;
      }

      if (linesWritten > 0) {
        langStats.linesWritten += linesWritten;
      }

      await stats.save();
      return stats;
    } catch (error) {
      console.error("Error updating language stats:", error);
      throw error;
    }
  }

  /**
   * Update productivity metrics
   */
  async updateProductivityMetrics(userId, metrics) {
    try {
      const updateFields = {};

      Object.keys(metrics).forEach((key) => {
        if (metrics[key] > 0) {
          updateFields[`productivity.${key}`] = metrics[key];
        }
      });

      if (Object.keys(updateFields).length > 0) {
        await UsageStatistics.findOneAndUpdate(
          { userId },
          { $inc: updateFields },
          { upsert: true }
        );
      }

      return true;
    } catch (error) {
      console.error("Error updating productivity metrics:", error);
      throw error;
    }
  }

  /**
   * Calculate and update effectiveness scores
   */
  async calculateEffectiveness(userId) {
    try {
      const stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        return null;
      }

      // Calculate overall effectiveness score
      let overallScore = 0;
      let scoreCount = 0;

      if (stats.effectiveness.codeQuality > 0) {
        overallScore += stats.effectiveness.codeQuality;
        scoreCount++;
      }

      if (stats.effectiveness.testCoverage > 0) {
        overallScore += stats.effectiveness.testCoverage;
        scoreCount++;
      }

      if (stats.effectiveness.aiAcceptanceRate > 0) {
        overallScore += stats.effectiveness.aiAcceptanceRate;
        scoreCount++;
      }

      if (stats.effectiveness.executionSuccessRate > 0) {
        overallScore += stats.effectiveness.executionSuccessRate;
        scoreCount++;
      }

      stats.effectiveness.overallScore =
        scoreCount > 0 ? overallScore / scoreCount : 0;
      await stats.save();

      return stats.effectiveness;
    } catch (error) {
      console.error("Error calculating effectiveness:", error);
      throw error;
    }
  }

  /**
   * Calculate and update top features
   */
  async calculateTopFeatures(userId) {
    try {
      const stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        return null;
      }

      await stats.calculateTopFeatures();
      return stats.topFeatures;
    } catch (error) {
      console.error("Error calculating top features:", error);
      throw error;
    }
  }

  /**
   * Get most used commands
   */
  async getMostUsedCommands(userId, limit = 10) {
    try {
      const stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        return [];
      }

      return stats.commandUsage
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((cmd) => ({
          command: cmd.command,
          category: cmd.category,
          count: cmd.count,
          successRate: cmd.successRate,
          avgExecutionTime: cmd.avgExecutionTime,
          userSatisfaction: cmd.userSatisfaction,
        }));
    } catch (error) {
      console.error("Error getting most used commands:", error);
      throw error;
    }
  }

  /**
   * Get AI usage summary
   */
  async getAIUsageSummary(userId) {
    try {
      const stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        return {
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          byModel: [],
          byTaskType: [],
        };
      }

      return {
        totalRequests: stats.aiModelUsage.totalRequests,
        totalTokens: stats.aiModelUsage.totalTokensUsed,
        totalCost: stats.aiModelUsage.totalCost,
        byModel: stats.aiModelUsage.byModel,
        byTaskType: stats.aiModelUsage.byTaskType,
      };
    } catch (error) {
      console.error("Error getting AI usage summary:", error);
      throw error;
    }
  }

  /**
   * Get activity timeline
   */
  async getActivityTimeline(userId, timeRange = 30) {
    try {
      const stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        return [];
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);

      return stats.analytics.daily
        .filter((d) => d.date >= cutoffDate)
        .sort((a, b) => a.date - b.date);
    } catch (error) {
      console.error("Error getting activity timeline:", error);
      throw error;
    }
  }

  /**
   * Get productivity summary
   */
  async getProductivitySummary(userId) {
    try {
      const stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        return {
          totalSessions: 0,
          totalActiveTime: 0,
          avgSessionDuration: 0,
          filesCreated: 0,
          filesModified: 0,
          linesOfCodeWritten: 0,
          testsGenerated: 0,
          bugsFixed: 0,
          codeRefactored: 0,
        };
      }

      return stats.productivity;
    } catch (error) {
      console.error("Error getting productivity summary:", error);
      throw error;
    }
  }

  /**
   * Get language distribution
   */
  async getLanguageDistribution(userId) {
    try {
      const stats = await UsageStatistics.findOne({ userId });

      if (!stats) {
        return [];
      }

      return stats.languageStats
        .sort(
          (a, b) =>
            b.filesCreated + b.filesEdited - (a.filesCreated + a.filesEdited)
        )
        .map((lang) => ({
          language: lang.language,
          totalFiles: lang.filesCreated + lang.filesEdited,
          filesCreated: lang.filesCreated,
          filesEdited: lang.filesEdited,
          linesWritten: lang.linesWritten,
          executionCount: lang.executionCount,
        }));
    } catch (error) {
      console.error("Error getting language distribution:", error);
      throw error;
    }
  }

  /**
   * Export statistics for IDE plugin
   */
  async exportStatistics(userId) {
    try {
      const stats = await UsageStatistics.findOne({ userId });
      const user = await User.findById(userId);

      if (!stats || !user) {
        return null;
      }

      return {
        user: {
          username: user.username,
          email: user.email,
          statistics: user.statistics,
        },
        commandUsage: stats.commandUsage,
        aiUsage: stats.aiModelUsage,
        featureUsage: stats.featureUsage,
        productivity: stats.productivity,
        effectiveness: stats.effectiveness,
        topFeatures: stats.topFeatures,
        languageStats: stats.languageStats,
        lastCalculated: stats.lastCalculated,
      };
    } catch (error) {
      console.error("Error exporting statistics:", error);
      throw error;
    }
  }

  /**
   * Reset statistics
   */
  async resetStatistics(userId) {
    try {
      await UsageStatistics.findOneAndUpdate(
        { userId },
        {
          commandUsage: [],
          "aiModelUsage.totalRequests": 0,
          "aiModelUsage.totalTokensUsed": 0,
          "aiModelUsage.totalCost": 0,
          "aiModelUsage.byModel": [],
          "aiModelUsage.byTaskType": [],
          featureUsage: {
            codeReview: 0,
            refactoring: 0,
            testGeneration: 0,
            qualityMetrics: 0,
            prediction: 0,
            codeExecution: 0,
            fileManagement: 0,
          },
          "analytics.daily": [],
          "analytics.weekly": [],
          "analytics.monthly": [],
          languageStats: [],
          productivity: {
            totalSessions: 0,
            totalActiveTime: 0,
            avgSessionDuration: 0,
            filesCreated: 0,
            filesModified: 0,
            linesOfCodeWritten: 0,
            testsGenerated: 0,
            bugsFixed: 0,
            codeRefactored: 0,
          },
          effectiveness: {
            overallScore: 0,
            codeQuality: 0,
            testCoverage: 0,
            aiAcceptanceRate: 0,
            executionSuccessRate: 0,
          },
          topFeatures: [],
        }
      );

      return true;
    } catch (error) {
      console.error("Error resetting statistics:", error);
      throw error;
    }
  }
}

module.exports = new UsageStatisticsService();
