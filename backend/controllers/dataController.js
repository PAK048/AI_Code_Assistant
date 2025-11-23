const authService = require("../services/authService");
const chatHistoryService = require("../services/chatHistoryService");
const executionLogService = require("../services/executionLogService");
const agentTaskService = require("../services/agentTaskService");
const sessionService = require("../services/sessionService");
const fileUploadService = require("../services/fileUploadService");
const usageStatisticsService = require("../services/usageStatisticsService");

/**
 * Data Management Controller
 * Handles all data management and insights API endpoints
 */
class DataController {
  // ==================== Authentication ====================

  /**
   * Auto-login (for single-user setup)
   * GET /api/data/auth/auto-login
   */
  async autoLogin(req, res) {
    try {
      const result = await authService.autoLogin();
      res.json(result);
    } catch (error) {
      console.error("Error in autoLogin:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Login
   * POST /api/data/auth/login
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      res.json(result);
    } catch (error) {
      console.error("Error in login:", error);
      res.status(401).json({ error: error.message });
    }
  }

  /**
   * Get current user
   * GET /api/data/auth/me
   */
  async getCurrentUser(req, res) {
    try {
      const user = await authService.getCurrentUser(req.userId);
      res.json(user);
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update user profile
   * PUT /api/data/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const user = await authService.updateProfile(req.userId, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error in updateProfile:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update user preferences
   * PUT /api/data/auth/preferences
   */
  async updatePreferences(req, res) {
    try {
      const preferences = await authService.updatePreferences(
        req.userId,
        req.body
      );
      res.json(preferences);
    } catch (error) {
      console.error("Error in updatePreferences:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== Chat History ====================

  /**
   * Add message to chat history
   * POST /api/data/chat/messages
   */
  async addChatMessage(req, res) {
    try {
      const { sessionId, role, content, metadata } = req.body;
      const chatHistory = await chatHistoryService.addMessage(
        sessionId,
        role,
        content,
        metadata
      );
      res.json(chatHistory);
    } catch (error) {
      console.error("Error in addChatMessage:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get chat history for session
   * GET /api/data/chat/sessions/:sessionId
   */
  async getChatHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const { limit } = req.query;
      const chatHistory = await chatHistoryService.getChatHistory(
        sessionId,
        limit ? parseInt(limit) : null
      );
      res.json(chatHistory);
    } catch (error) {
      console.error("Error in getChatHistory:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all chat histories for user
   * GET /api/data/chat/histories
   */
  async getUserChatHistories(req, res) {
    try {
      const { limit = 10, skip = 0 } = req.query;
      const histories = await chatHistoryService.getUserChatHistories(
        req.userId,
        parseInt(limit),
        parseInt(skip)
      );
      res.json(histories);
    } catch (error) {
      console.error("Error in getUserChatHistories:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Search messages
   * GET /api/data/chat/search
   */
  async searchMessages(req, res) {
    try {
      const { query, limit = 50 } = req.query;
      const results = await chatHistoryService.searchMessages(
        req.userId,
        query,
        parseInt(limit)
      );
      res.json(results);
    } catch (error) {
      console.error("Error in searchMessages:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get chat statistics
   * GET /api/data/chat/statistics
   */
  async getChatStatistics(req, res) {
    try {
      const { timeRange = 7 } = req.query;
      const stats = await chatHistoryService.getChatStatistics(
        req.userId,
        parseInt(timeRange)
      );
      res.json(stats);
    } catch (error) {
      console.error("Error in getChatStatistics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== Execution Logs ====================

  /**
   * Create execution log
   * POST /api/data/execution/logs
   */
  async createExecutionLog(req, res) {
    try {
      const log = await executionLogService.createExecutionLog(req.body);
      res.json(log);
    } catch (error) {
      console.error("Error in createExecutionLog:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get execution logs for user
   * GET /api/data/execution/logs
   */
  async getUserExecutionLogs(req, res) {
    try {
      const { limit = 50, skip = 0, ...filters } = req.query;
      const logs = await executionLogService.getUserExecutionLogs(
        req.userId,
        filters,
        parseInt(limit),
        parseInt(skip)
      );
      res.json(logs);
    } catch (error) {
      console.error("Error in getUserExecutionLogs:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get execution log by ID
   * GET /api/data/execution/logs/:logId
   */
  async getExecutionLogById(req, res) {
    try {
      const { logId } = req.params;
      const log = await executionLogService.getExecutionLogById(logId);
      res.json(log);
    } catch (error) {
      console.error("Error in getExecutionLogById:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get execution statistics
   * GET /api/data/execution/statistics
   */
  async getExecutionStatistics(req, res) {
    try {
      const { timeRange = 7 } = req.query;
      const stats = await executionLogService.getExecutionStatistics(
        req.userId,
        parseInt(timeRange)
      );
      res.json(stats);
    } catch (error) {
      console.error("Error in getExecutionStatistics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get failed executions
   * GET /api/data/execution/failed
   */
  async getFailedExecutions(req, res) {
    try {
      const { limit = 20 } = req.query;
      const logs = await executionLogService.getFailedExecutions(
        req.userId,
        parseInt(limit)
      );
      res.json(logs);
    } catch (error) {
      console.error("Error in getFailedExecutions:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get test execution summary
   * GET /api/data/execution/tests/summary
   */
  async getTestExecutionSummary(req, res) {
    try {
      const { timeRange = 7 } = req.query;
      const summary = await executionLogService.getTestExecutionSummary(
        req.userId,
        parseInt(timeRange)
      );
      res.json(summary);
    } catch (error) {
      console.error("Error in getTestExecutionSummary:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get performance metrics
   * GET /api/data/execution/performance
   */
  async getPerformanceMetrics(req, res) {
    try {
      const { timeRange = 30 } = req.query;
      const metrics = await executionLogService.getPerformanceMetrics(
        req.userId,
        parseInt(timeRange)
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error in getPerformanceMetrics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== Agent Tasks ====================

  /**
   * Create agent task
   * POST /api/data/agent/tasks
   */
  async createAgentTask(req, res) {
    try {
      const task = await agentTaskService.createAgentTask(req.body);
      res.json(task);
    } catch (error) {
      console.error("Error in createAgentTask:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update agent task status
   * PUT /api/data/agent/tasks/:taskId/status
   */
  async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const { status, output, error } = req.body;
      const task = await agentTaskService.updateTaskStatus(
        taskId,
        status,
        output,
        error
      );
      res.json(task);
    } catch (error) {
      console.error("Error in updateTaskStatus:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Add user feedback to task
   * POST /api/data/agent/tasks/:taskId/feedback
   */
  async addTaskFeedback(req, res) {
    try {
      const { taskId } = req.params;
      const task = await agentTaskService.addUserFeedback(taskId, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error in addTaskFeedback:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get user agent tasks
   * GET /api/data/agent/tasks
   */
  async getUserTasks(req, res) {
    try {
      const { limit = 50, skip = 0, ...filters } = req.query;
      const tasks = await agentTaskService.getUserTasks(
        req.userId,
        filters,
        parseInt(limit),
        parseInt(skip)
      );
      res.json(tasks);
    } catch (error) {
      console.error("Error in getUserTasks:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get task by ID
   * GET /api/data/agent/tasks/:taskId
   */
  async getTaskById(req, res) {
    try {
      const { taskId } = req.params;
      const task = await agentTaskService.getTaskById(taskId);
      res.json(task);
    } catch (error) {
      console.error("Error in getTaskById:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get task statistics
   * GET /api/data/agent/tasks/statistics
   */
  async getTaskStatistics(req, res) {
    try {
      const { timeRange = 7 } = req.query;
      const stats = await agentTaskService.getTaskStatistics(
        req.userId,
        parseInt(timeRange)
      );
      res.json(stats);
    } catch (error) {
      console.error("Error in getTaskStatistics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get task effectiveness by type
   * GET /api/data/agent/tasks/effectiveness
   */
  async getTaskEffectiveness(req, res) {
    try {
      const effectiveness = await agentTaskService.getTaskEffectivenessByType(
        req.userId
      );
      res.json(effectiveness);
    } catch (error) {
      console.error("Error in getTaskEffectiveness:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get task timeline
   * GET /api/data/agent/tasks/timeline
   */
  async getTaskTimeline(req, res) {
    try {
      const { timeRange = 30 } = req.query;
      const timeline = await agentTaskService.getTaskTimeline(
        req.userId,
        parseInt(timeRange)
      );
      res.json(timeline);
    } catch (error) {
      console.error("Error in getTaskTimeline:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== Sessions ====================

  /**
   * Create session
   * POST /api/data/sessions
   */
  async createSession(req, res) {
    try {
      const session = await sessionService.createSession(req.userId, req.body);
      res.json(session);
    } catch (error) {
      console.error("Error in createSession:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get session by ID
   * GET /api/data/sessions/:sessionId
   */
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      const session = await sessionService.getSessionById(sessionId);
      res.json(session);
    } catch (error) {
      console.error("Error in getSession:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get user sessions
   * GET /api/data/sessions
   */
  async getUserSessions(req, res) {
    try {
      const { limit = 20, skip = 0, ...filters } = req.query;
      const sessions = await sessionService.getUserSessions(
        req.userId,
        filters,
        parseInt(limit),
        parseInt(skip)
      );
      res.json(sessions);
    } catch (error) {
      console.error("Error in getUserSessions:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get active sessions
   * GET /api/data/sessions/active
   */
  async getActiveSessions(req, res) {
    try {
      const sessions = await sessionService.getActiveSessions(req.userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error in getActiveSessions:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update session
   * PUT /api/data/sessions/:sessionId
   */
  async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const session = await sessionService.updateSession(sessionId, req.body);
      res.json(session);
    } catch (error) {
      console.error("Error in updateSession:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * End session
   * POST /api/data/sessions/:sessionId/end
   */
  async endSession(req, res) {
    try {
      const { sessionId } = req.params;
      const session = await sessionService.endSession(sessionId);
      res.json(session);
    } catch (error) {
      console.error("Error in endSession:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get session statistics
   * GET /api/data/sessions/statistics
   */
  async getSessionStatistics(req, res) {
    try {
      const { timeRange = 30 } = req.query;
      const stats = await sessionService.getSessionStatistics(
        req.userId,
        parseInt(timeRange)
      );
      res.json(stats);
    } catch (error) {
      console.error("Error in getSessionStatistics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== File Uploads ====================

  /**
   * Upload file
   * POST /api/data/files/upload
   */
  async uploadFile(req, res) {
    try {
      const { sessionId } = req.body;
      const fileData = {
        ...req.body,
        file: req.file,
      };
      const file = await fileUploadService.uploadFile(
        req.userId,
        sessionId,
        fileData
      );
      res.json(file);
    } catch (error) {
      console.error("Error in uploadFile:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get user files
   * GET /api/data/files
   */
  async getUserFiles(req, res) {
    try {
      const { limit = 50, skip = 0, ...filters } = req.query;
      const files = await fileUploadService.getUserFiles(
        req.userId,
        filters,
        parseInt(limit),
        parseInt(skip)
      );
      res.json(files);
    } catch (error) {
      console.error("Error in getUserFiles:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get file by ID
   * GET /api/data/files/:fileId
   */
  async getFileById(req, res) {
    try {
      const { fileId } = req.params;
      const file = await fileUploadService.getFileById(fileId);
      res.json(file);
    } catch (error) {
      console.error("Error in getFileById:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get storage statistics
   * GET /api/data/files/statistics
   */
  async getStorageStatistics(req, res) {
    try {
      const stats = await fileUploadService.getStorageStatistics(req.userId);
      res.json(stats);
    } catch (error) {
      console.error("Error in getStorageStatistics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Delete file
   * DELETE /api/data/files/:fileId
   */
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      await fileUploadService.deleteFile(fileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error in deleteFile:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== Usage Statistics & Insights ====================

  /**
   * Get user insights
   * GET /api/data/insights
   */
  async getUserInsights(req, res) {
    try {
      const insights = await usageStatisticsService.getUserInsights(req.userId);
      res.json(insights);
    } catch (error) {
      console.error("Error in getUserInsights:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get user statistics
   * GET /api/data/statistics
   */
  async getUserStatistics(req, res) {
    try {
      const stats = await usageStatisticsService.getUserStatistics(req.userId);
      res.json(stats);
    } catch (error) {
      console.error("Error in getUserStatistics:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get most used commands
   * GET /api/data/statistics/commands
   */
  async getMostUsedCommands(req, res) {
    try {
      const { limit = 10 } = req.query;
      const commands = await usageStatisticsService.getMostUsedCommands(
        req.userId,
        parseInt(limit)
      );
      res.json(commands);
    } catch (error) {
      console.error("Error in getMostUsedCommands:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get AI usage summary
   * GET /api/data/statistics/ai
   */
  async getAIUsageSummary(req, res) {
    try {
      const summary = await usageStatisticsService.getAIUsageSummary(
        req.userId
      );
      res.json(summary);
    } catch (error) {
      console.error("Error in getAIUsageSummary:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get activity timeline
   * GET /api/data/statistics/timeline
   */
  async getActivityTimeline(req, res) {
    try {
      const { timeRange = 30 } = req.query;
      const timeline = await usageStatisticsService.getActivityTimeline(
        req.userId,
        parseInt(timeRange)
      );
      res.json(timeline);
    } catch (error) {
      console.error("Error in getActivityTimeline:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get productivity summary
   * GET /api/data/statistics/productivity
   */
  async getProductivitySummary(req, res) {
    try {
      const summary = await usageStatisticsService.getProductivitySummary(
        req.userId
      );
      res.json(summary);
    } catch (error) {
      console.error("Error in getProductivitySummary:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get language distribution
   * GET /api/data/statistics/languages
   */
  async getLanguageDistribution(req, res) {
    try {
      const distribution = await usageStatisticsService.getLanguageDistribution(
        req.userId
      );
      res.json(distribution);
    } catch (error) {
      console.error("Error in getLanguageDistribution:", error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Export statistics
   * GET /api/data/statistics/export
   */
  async exportStatistics(req, res) {
    try {
      const data = await usageStatisticsService.exportStatistics(req.userId);
      res.json(data);
    } catch (error) {
      console.error("Error in exportStatistics:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new DataController();
