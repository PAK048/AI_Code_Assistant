const express = require("express");
const router = express.Router();
const projectHealthController = require("../controllers/projectHealthController");
const { authenticate } = require("../services/authService");

// Analyze project
router.post("/analyze", authenticate, projectHealthController.analyzeProject);

// Get project health
router.get(
  "/health/:id",
  authenticate,
  projectHealthController.getProjectHealth
);
router.get(
  "/health",
  authenticate,
  projectHealthController.getProjectHealthByPath
);

// Get project overview/dashboard
router.get(
  "/overview",
  authenticate,
  projectHealthController.getProjectOverview
);

// File metrics
router.get(
  "/file-metrics",
  authenticate,
  projectHealthController.getFileMetrics
);

// Recommendations
router.get(
  "/recommendations",
  authenticate,
  projectHealthController.getRecommendations
);
router.put(
  "/health/:id/recommendations/:index",
  authenticate,
  projectHealthController.updateRecommendationStatus
);
router.post(
  "/health/:id/recommendations",
  authenticate,
  projectHealthController.addRecommendation
);

// Test failures
router.get(
  "/test-failures",
  authenticate,
  projectHealthController.getTestFailures
);

// Code quality
router.get(
  "/duplications",
  authenticate,
  projectHealthController.getCodeDuplications
);
router.get("/call-graph", authenticate, projectHealthController.getCallGraph);
router.get(
  "/complexity-hotspots",
  authenticate,
  projectHealthController.getComplexityHotspots
);

// Git/PR data
router.get("/pending-prs", authenticate, projectHealthController.getPendingPRs);
router.get(
  "/branches",
  authenticate,
  projectHealthController.getBranchesStatus
);

module.exports = router;
