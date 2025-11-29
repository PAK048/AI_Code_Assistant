const express = require("express");
const router = express.Router();
const {
  processIntent,
  generateCode,
  handleFileOperation,
  retrieveContext,
  runCommand,
  handleGitOperation,
  chatOrchestrate,
  reviewCode,
  applyRefactoring,
  getPredictions,
  generateTests,
  executeTests,
  getMetrics,
  analyzeDeps,
  runBatchTests,
  getBatchMetrics,
  getStyleCompliance,
  // File session management
  getSessionFiles,
  addSessionFile,
  uploadSessionFile,
  removeSessionFile,
  getSessionFile,
  updateSessionFile,
  saveSessionFile,
  setActiveFile,
  storeFileResults,
  getFileResults,
  exportSession,
  importSession,
} = require("../controllers/agentController");

// Individual agent endpoints
router.post("/intent", processIntent);
router.post("/generate", generateCode);
router.post("/file", handleFileOperation);
router.post("/retrieve", retrieveContext);
router.post("/run", runCommand);
router.post("/git", handleGitOperation);

// Code review endpoints
router.post("/review", reviewCode);
router.post("/refactor", applyRefactoring);

// Predictive suggestions endpoints
router.post("/predictions", getPredictions);
router.post("/generate-tests", generateTests);
router.post("/execute-tests", executeTests);
router.post("/metrics", getMetrics);
router.post("/analyze-deps", analyzeDeps);

// Batch operation endpoints (multi-file analysis)
router.post("/batch/tests", runBatchTests);
router.post("/batch/metrics", getBatchMetrics);
router.post("/batch/style-check", getStyleCompliance);

// File session management endpoints
router.get("/session/files", getSessionFiles);
router.post("/session/files", addSessionFile);
router.post("/session/files/upload", uploadSessionFile);
router.delete("/session/files/:fileId", removeSessionFile);
router.get("/session/files/:fileId", getSessionFile);
router.put("/session/files/:fileId", updateSessionFile);
router.post("/session/files/:fileId/save", saveSessionFile);
router.post("/session/files/:fileId/activate", setActiveFile);
router.post("/session/files/:fileId/results", storeFileResults);
router.get("/session/files/:fileId/results/:resultType", getFileResults);
router.get("/session/export", exportSession);
router.post("/session/import", importSession);

// Unified orchestration endpoint (recommended for full workflow)
router.post("/chat", chatOrchestrate);

module.exports = router;
