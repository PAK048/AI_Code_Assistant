const projectHealthService = require("../services/projectHealthService");

/**
 * Analyze project and generate health report
 */
exports.analyzeProject = async (req, res) => {
  try {
    const { projectPath, projectId, source, githubUrl, filePatterns } =
      req.body;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    if (!projectPath && !githubUrl) {
      return res
        .status(400)
        .json({ error: "Project path or GitHub URL is required" });
    }

    console.log(
      `[ProjectHealthController] Analyzing project. Source: ${source}, GitHub: ${githubUrl}, Path: ${projectPath}`
    );

    const projectHealth = await projectHealthService.analyzeProject(
      userId,
      {
        projectPath,
        projectId,
        source,
        githubUrl,
      },
      {
        filePatterns,
      }
    );

    res.json({
      success: true,
      projectHealth,
    });
  } catch (error) {
    console.error("Analyze project error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get project health by ID
 */
exports.getProjectHealth = async (req, res) => {
  try {
    const { id } = req.params;

    const projectHealth = await projectHealthService.getProjectHealth(id);

    if (!projectHealth) {
      return res.status(404).json({ error: "Project health not found" });
    }

    res.json({
      success: true,
      projectHealth,
    });
  } catch (error) {
    console.error("Get project health error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get project health by path or ID
 */
exports.getProjectHealthByPath = async (req, res) => {
  try {
    const { projectPath, projectId } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    if (!projectPath && !projectId) {
      return res.status(400).json({ error: "Project path or ID is required" });
    }

    let projectHealth;
    if (projectId) {
      projectHealth = await projectHealthService.getProjectHealth(projectId);
    } else {
      projectHealth = await projectHealthService.getProjectHealthByPath(
        userId,
        projectPath
      );
    }

    if (!projectHealth) {
      return res.status(404).json({ error: "Project health not found" });
    }

    res.json({
      success: true,
      projectHealth,
    });
  } catch (error) {
    console.error("Get project health by path error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get project overview/dashboard data
 */
exports.getProjectOverview = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    const overview = {
      projectName: projectHealth.projectName,
      healthScore: projectHealth.calculateHealthScore(),
      lastAnalyzed: projectHealth.lastAnalyzed,

      // Git status
      gitStatus: {
        currentBranch: projectHealth.currentBranch,
        isDirty: projectHealth.isDirty,
        uncommittedChanges: projectHealth.uncommittedChanges,
        pendingPRs: projectHealth.pendingPRs.length,
        branches: projectHealth.branches.length,
      },

      // Overall metrics
      metrics: projectHealth.overallMetrics,

      // Test summary
      testSummary: projectHealth.testSummary,

      // Critical files
      criticalFiles: projectHealth.getCriticalFiles(),

      // Top recommendations
      topRecommendations: projectHealth.recommendations
        .filter((r) => r.status === "pending")
        .slice(0, 5),

      // Language distribution
      languages: projectHealth.languages,

      // Stats
      stats: {
        totalFiles: projectHealth.totalFiles,
        totalLinesOfCode: projectHealth.totalLinesOfCode,
        totalRecommendations: projectHealth.recommendations.length,
        criticalIssues: projectHealth.recommendations.filter(
          (r) => r.priority === "critical" && r.status === "pending"
        ).length,
      },
    };

    res.json({
      success: true,
      overview,
    });
  } catch (error) {
    console.error("Get project overview error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get file metrics
 */
exports.getFileMetrics = async (req, res) => {
  try {
    const { projectPath, filePath } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    const fileMetrics = projectHealth.files.find(
      (f) => f.filePath === filePath
    );

    if (!fileMetrics) {
      return res.status(404).json({ error: "File metrics not found" });
    }

    // Get relevant recommendations for this file
    const fileRecommendations = projectHealth.recommendations.filter(
      (r) => r.filePath === filePath
    );

    // Get call graph info for this file
    const fileFunctions = projectHealth.callGraph.filter(
      (node) => node.filePath === filePath
    );

    res.json({
      success: true,
      metrics: fileMetrics,
      recommendations: fileRecommendations,
      functions: fileFunctions,
    });
  } catch (error) {
    console.error("Get file metrics error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get recommendations
 */
exports.getRecommendations = async (req, res) => {
  try {
    const { projectPath, priority, type, status } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    let recommendations = projectHealth.recommendations;

    // Apply filters
    if (priority) {
      recommendations = recommendations.filter((r) => r.priority === priority);
    }

    if (type) {
      recommendations = recommendations.filter((r) => r.type === type);
    }

    if (status) {
      recommendations = recommendations.filter((r) => r.status === status);
    }

    res.json({
      success: true,
      recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update recommendation status
 */
exports.updateRecommendationStatus = async (req, res) => {
  try {
    const { id, index } = req.params;
    const { status } = req.body;

    const projectHealth = await projectHealthService.updateRecommendationStatus(
      id,
      parseInt(index),
      status
    );

    res.json({
      success: true,
      projectHealth,
    });
  } catch (error) {
    console.error("Update recommendation error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get test failures
 */
exports.getTestFailures = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    const testFailures = [];

    projectHealth.files.forEach((file) => {
      if (file.testFailures.length > 0) {
        testFailures.push({
          filePath: file.filePath,
          fileName: file.fileName,
          failures: file.testFailures,
        });
      }
    });

    res.json({
      success: true,
      testFailures,
      total: testFailures.reduce((sum, f) => sum + f.failures.length, 0),
      summary: projectHealth.testSummary,
    });
  } catch (error) {
    console.error("Get test failures error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get code duplications
 */
exports.getCodeDuplications = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    res.json({
      success: true,
      duplications: projectHealth.duplications,
      total: projectHealth.duplications.length,
      duplicationPercentage: projectHealth.overallMetrics.duplicationPercentage,
    });
  } catch (error) {
    console.error("Get duplications error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get call graph
 */
exports.getCallGraph = async (req, res) => {
  try {
    const { projectPath, filePath } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    let callGraph = projectHealth.callGraph;

    // Filter by file if specified
    if (filePath) {
      callGraph = callGraph.filter((node) => node.filePath === filePath);
    }

    res.json({
      success: true,
      callGraph,
      total: callGraph.length,
    });
  } catch (error) {
    console.error("Get call graph error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending PRs
 */
exports.getPendingPRs = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    res.json({
      success: true,
      pendingPRs: projectHealth.pendingPRs,
      total: projectHealth.pendingPRs.length,
    });
  } catch (error) {
    console.error("Get pending PRs error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get branches status
 */
exports.getBranchesStatus = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    res.json({
      success: true,
      currentBranch: projectHealth.currentBranch,
      branches: projectHealth.branches,
      isDirty: projectHealth.isDirty,
      uncommittedChanges: projectHealth.uncommittedChanges,
    });
  } catch (error) {
    console.error("Get branches status error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add custom recommendation
 */
exports.addRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const recommendation = req.body;

    const projectHealth = await projectHealthService.addRecommendation(
      id,
      recommendation
    );

    res.json({
      success: true,
      projectHealth,
    });
  } catch (error) {
    console.error("Add recommendation error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get complexity hotspots (files with highest complexity)
 */
exports.getComplexityHotspots = async (req, res) => {
  try {
    const { projectPath, limit = 10 } = req.query;
    const userId = req.user
      ? req.user.userId || req.user.id || req.userId
      : "default-user";

    const projectHealth = await projectHealthService.getProjectHealthByPath(
      userId,
      projectPath
    );

    if (!projectHealth) {
      return res.status(404).json({ error: "Project not analyzed yet" });
    }

    const hotspots = projectHealth.files
      .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      hotspots,
    });
  } catch (error) {
    console.error("Get complexity hotspots error:", error);
    res.status(500).json({ error: error.message });
  }
};
