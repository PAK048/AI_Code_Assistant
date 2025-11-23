const express = require("express");
const router = express.Router();
const dataController = require("../controllers/dataController");
const authService = require("../services/authService");

// Authentication middleware
const authenticate = (req, res, next) =>
  authService.authenticateRequest(req, res, next);

// ==================== Authentication Routes ====================
router.get("/auth/auto-login", dataController.autoLogin);
router.post("/auth/login", dataController.login);
router.get("/auth/me", authenticate, dataController.getCurrentUser);
router.put("/auth/profile", authenticate, dataController.updateProfile);
router.put("/auth/preferences", authenticate, dataController.updatePreferences);

// ==================== Chat History Routes ====================
router.post("/chat/messages", authenticate, dataController.addChatMessage);
router.get(
  "/chat/sessions/:sessionId",
  authenticate,
  dataController.getChatHistory
);
router.get(
  "/chat/histories",
  authenticate,
  dataController.getUserChatHistories
);
router.get("/chat/search", authenticate, dataController.searchMessages);
router.get("/chat/statistics", authenticate, dataController.getChatStatistics);

// ==================== Execution Log Routes ====================
router.post("/execution/logs", authenticate, dataController.createExecutionLog);
router.get(
  "/execution/logs",
  authenticate,
  dataController.getUserExecutionLogs
);
router.get(
  "/execution/logs/:logId",
  authenticate,
  dataController.getExecutionLogById
);
router.get(
  "/execution/statistics",
  authenticate,
  dataController.getExecutionStatistics
);
router.get(
  "/execution/failed",
  authenticate,
  dataController.getFailedExecutions
);
router.get(
  "/execution/tests/summary",
  authenticate,
  dataController.getTestExecutionSummary
);
router.get(
  "/execution/performance",
  authenticate,
  dataController.getPerformanceMetrics
);

// ==================== Agent Task Routes ====================
router.post("/agent/tasks", authenticate, dataController.createAgentTask);
router.put(
  "/agent/tasks/:taskId/status",
  authenticate,
  dataController.updateTaskStatus
);
router.post(
  "/agent/tasks/:taskId/feedback",
  authenticate,
  dataController.addTaskFeedback
);
router.get("/agent/tasks", authenticate, dataController.getUserTasks);
router.get(
  "/agent/tasks/statistics",
  authenticate,
  dataController.getTaskStatistics
);
router.get(
  "/agent/tasks/effectiveness",
  authenticate,
  dataController.getTaskEffectiveness
);
router.get(
  "/agent/tasks/timeline",
  authenticate,
  dataController.getTaskTimeline
);
router.get("/agent/tasks/:taskId", authenticate, dataController.getTaskById);

// ==================== Session Routes ====================
router.post("/sessions", authenticate, dataController.createSession);
router.get("/sessions", authenticate, dataController.getUserSessions);
router.get("/sessions/active", authenticate, dataController.getActiveSessions);
router.get(
  "/sessions/statistics",
  authenticate,
  dataController.getSessionStatistics
);
router.get("/sessions/:sessionId", authenticate, dataController.getSession);
router.put("/sessions/:sessionId", authenticate, dataController.updateSession);
router.post(
  "/sessions/:sessionId/end",
  authenticate,
  dataController.endSession
);

// ==================== File Upload Routes ====================
router.post("/files/upload", authenticate, dataController.uploadFile);
router.get("/files", authenticate, dataController.getUserFiles);
router.get(
  "/files/statistics",
  authenticate,
  dataController.getStorageStatistics
);
router.get("/files/:fileId", authenticate, dataController.getFileById);
router.delete("/files/:fileId", authenticate, dataController.deleteFile);

// ==================== Usage Statistics & Insights Routes ====================
router.get("/insights", authenticate, dataController.getUserInsights);
router.get("/statistics", authenticate, dataController.getUserStatistics);
router.get(
  "/statistics/commands",
  authenticate,
  dataController.getMostUsedCommands
);
router.get("/statistics/ai", authenticate, dataController.getAIUsageSummary);
router.get(
  "/statistics/timeline",
  authenticate,
  dataController.getActivityTimeline
);
router.get(
  "/statistics/productivity",
  authenticate,
  dataController.getProductivitySummary
);
router.get(
  "/statistics/languages",
  authenticate,
  dataController.getLanguageDistribution
);
router.get("/statistics/export", authenticate, dataController.exportStatistics);

module.exports = router;
