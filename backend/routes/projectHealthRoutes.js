const express = require("express");
const router = express.Router();
const projectHealthController = require("../controllers/projectHealthController");
const { optionalAuth } = require("../services/authService");

// Analyze project (authentication optional)
router.post("/analyze", optionalAuth, projectHealthController.analyzeProject);

// Get project health (authentication optional)
router.get(
  "/health/:id",
  optionalAuth,
  projectHealthController.getProjectHealth
);
router.get(
  "/health",
  optionalAuth,
  projectHealthController.getProjectHealthByPath
);

// Get project overview/dashboard (authentication optional)
router.get(
  "/overview",
  optionalAuth,
  projectHealthController.getProjectOverview
);

// File metrics (authentication optional)
router.get(
  "/file-metrics",
  optionalAuth,
  projectHealthController.getFileMetrics
);

// Recommendations (authentication optional)
router.get(
  "/recommendations",
  optionalAuth,
  projectHealthController.getRecommendations
);
router.put(
  "/health/:id/recommendations/:index",
  optionalAuth,
  projectHealthController.updateRecommendationStatus
);
router.post(
  "/health/:id/recommendations",
  optionalAuth,
  projectHealthController.addRecommendation
);

// Test failures
router.get(
  "/test-failures",
  optionalAuth,
  projectHealthController.getTestFailures
);

// Code quality
router.get(
  "/duplications",
  optionalAuth,
  projectHealthController.getCodeDuplications
);
router.get("/call-graph", optionalAuth, projectHealthController.getCallGraph);
router.get(
  "/complexity-hotspots",
  optionalAuth,
  projectHealthController.getComplexityHotspots
);

// Git/PR data
router.get("/pending-prs", optionalAuth, projectHealthController.getPendingPRs);
router.get(
  "/branches",
  optionalAuth,
  projectHealthController.getBranchesStatus
);

module.exports = router;
