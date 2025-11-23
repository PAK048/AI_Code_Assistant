const mongoose = require("mongoose");

const FileMetricSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  language: String,
  size: Number,
  linesOfCode: Number,

  // Complexity metrics
  cyclomaticComplexity: { type: Number, default: 0 },
  cognitiveComplexity: { type: Number, default: 0 },
  maintainabilityIndex: { type: Number, default: 0 }, // 0-100
  halsteadMetrics: {
    volume: Number,
    difficulty: Number,
    effort: Number,
    bugs: Number,
  },

  // Quality metrics
  duplicationPercentage: { type: Number, default: 0 },
  commentDensity: { type: Number, default: 0 },
  codeSmells: { type: Number, default: 0 },
  technicalDebt: { type: Number, default: 0 }, // minutes

  // Test metrics
  testCoverage: { type: Number, default: 0 }, // percentage
  testCount: { type: Number, default: 0 },
  testFailures: [
    {
      testName: String,
      error: String,
      line: Number,
      timestamp: Date,
    },
  ],

  // Dependencies
  imports: [String],
  exports: [String],
  dependencies: [String],

  lastAnalyzed: { type: Date, default: Date.now },
});

FileMetricSchema.index({ filePath: 1 });

const CallGraphNodeSchema = new mongoose.Schema({
  functionName: { type: String, required: true },
  filePath: String,
  startLine: Number,
  endLine: Number,
  calls: [String], // Function names it calls
  calledBy: [String], // Functions that call this
  complexity: Number,
  linesOfCode: Number,
  parameters: Number,
  depth: Number, // Call depth
});

const ProjectHealthSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectPath: { type: String, required: true },
    projectName: String,

    // Git status
    currentBranch: String,
    isDirty: Boolean,
    uncommittedChanges: Number,
    pendingPRs: [
      {
        prNumber: Number,
        title: String,
        state: String, // open, closed, merged
        author: String,
        branch: String,
        createdAt: Date,
        filesChanged: Number,
        additions: Number,
        deletions: Number,
        reviewStatus: String, // pending, approved, changes_requested
        url: String,
      },
    ],
    branches: [
      {
        name: String,
        lastCommit: Date,
        behind: Number,
        ahead: Number,
      },
    ],

    // File metrics
    files: [FileMetricSchema],
    totalFiles: { type: Number, default: 0 },
    totalLinesOfCode: { type: Number, default: 0 },

    // Call graph for complexity analysis
    callGraph: [CallGraphNodeSchema],

    // Code duplication map (hash -> files containing it)
    duplications: [
      {
        hash: String,
        code: String,
        files: [
          {
            filePath: String,
            startLine: Number,
            endLine: Number,
          },
        ],
        severity: String, // low, medium, high
      },
    ],

    // Overall metrics
    overallMetrics: {
      avgComplexity: { type: Number, default: 0 },
      avgMaintainability: { type: Number, default: 0 },
      totalTechnicalDebt: { type: Number, default: 0 }, // minutes
      totalCodeSmells: { type: Number, default: 0 },
      overallTestCoverage: { type: Number, default: 0 },
      defectDensity: { type: Number, default: 0 }, // defects per 1000 LOC
      duplicationPercentage: { type: Number, default: 0 },
    },

    // AI recommendations
    recommendations: [
      {
        type: String, // refactor, test, fix, optimize, document
        priority: String, // critical, high, medium, low
        filePath: String,
        title: String,
        description: String,
        estimatedEffort: Number, // minutes
        potentialImpact: String,
        suggestedAction: String,
        autoFixAvailable: Boolean,
        createdAt: { type: Date, default: Date.now },
        status: { type: String, default: "pending" }, // pending, accepted, rejected, completed
        appliedAt: Date,
      },
    ],

    // Test failures summary
    testSummary: {
      totalTests: { type: Number, default: 0 },
      passing: { type: Number, default: 0 },
      failing: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      lastRunAt: Date,
      duration: Number, // milliseconds
    },

    // Language distribution
    languages: [
      {
        language: String,
        filesCount: Number,
        linesOfCode: Number,
        percentage: Number,
      },
    ],

    lastAnalyzed: { type: Date, default: Date.now },
    analysisStatus: { type: String, default: "pending" }, // pending, analyzing, completed, failed
    analysisError: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ProjectHealthSchema.index({ userId: 1, projectPath: 1 });
ProjectHealthSchema.index({ lastAnalyzed: -1 });
ProjectHealthSchema.index({ "files.filePath": 1 });
ProjectHealthSchema.index({
  "recommendations.priority": 1,
  "recommendations.status": 1,
});

// Method to calculate overall health score
ProjectHealthSchema.methods.calculateHealthScore = function () {
  const metrics = this.overallMetrics;

  // Weighted scoring (0-100)
  const maintainabilityScore = metrics.avgMaintainability || 0;
  const complexityScore = Math.max(0, 100 - metrics.avgComplexity * 5); // Lower is better
  const coverageScore = metrics.overallTestCoverage || 0;
  const duplicationScore = Math.max(0, 100 - metrics.duplicationPercentage * 2); // Lower is better
  const defectScore = Math.max(0, 100 - metrics.defectDensity * 10); // Lower is better

  const healthScore =
    maintainabilityScore * 0.25 +
    complexityScore * 0.2 +
    coverageScore * 0.25 +
    duplicationScore * 0.15 +
    defectScore * 0.15;

  return Math.round(healthScore);
};

// Method to get critical files (need immediate attention)
ProjectHealthSchema.methods.getCriticalFiles = function () {
  return this.files
    .filter(
      (file) =>
        file.cyclomaticComplexity > 15 ||
        file.maintainabilityIndex < 40 ||
        file.testFailures.length > 0 ||
        file.duplicationPercentage > 20
    )
    .sort((a, b) => {
      // Sort by severity
      const scoreA =
        a.cyclomaticComplexity +
        (100 - a.maintainabilityIndex) +
        a.testFailures.length * 10;
      const scoreB =
        b.cyclomaticComplexity +
        (100 - b.maintainabilityIndex) +
        b.testFailures.length * 10;
      return scoreB - scoreA;
    })
    .slice(0, 10);
};

// Method to generate refactoring suggestions
ProjectHealthSchema.methods.generateRefactoringSuggestions = function () {
  const suggestions = [];

  // High complexity files
  this.files.forEach((file) => {
    if (file.cyclomaticComplexity > 15) {
      suggestions.push({
        type: "refactor",
        priority: file.cyclomaticComplexity > 25 ? "critical" : "high",
        filePath: file.filePath,
        title: `Reduce complexity in ${file.fileName}`,
        description: `Cyclomatic complexity is ${file.cyclomaticComplexity}. Consider breaking down into smaller functions.`,
        estimatedEffort: Math.min(file.cyclomaticComplexity * 5, 120),
        potentialImpact: "Improved maintainability and testability",
        suggestedAction: "Extract complex logic into separate functions",
        autoFixAvailable: false,
      });
    }

    // Low test coverage
    if (file.testCoverage < 50 && file.linesOfCode > 50) {
      suggestions.push({
        type: "test",
        priority: file.testCoverage < 20 ? "high" : "medium",
        filePath: file.filePath,
        title: `Increase test coverage for ${file.fileName}`,
        description: `Current coverage is ${file.testCoverage}%. Add unit tests for critical paths.`,
        estimatedEffort: Math.min((100 - file.testCoverage) * 2, 180),
        potentialImpact: "Reduced defect risk and improved code quality",
        suggestedAction: "Generate unit tests for uncovered code paths",
        autoFixAvailable: true,
      });
    }

    // Test failures
    if (file.testFailures.length > 0) {
      suggestions.push({
        type: "fix",
        priority: "critical",
        filePath: file.filePath,
        title: `Fix ${file.testFailures.length} failing test(s) in ${file.fileName}`,
        description: `Tests are failing: ${file.testFailures
          .map((t) => t.testName)
          .join(", ")}`,
        estimatedEffort: file.testFailures.length * 15,
        potentialImpact: "Restore code quality and prevent regressions",
        suggestedAction: "Debug and fix failing tests",
        autoFixAvailable: false,
      });
    }

    // High duplication
    if (file.duplicationPercentage > 20) {
      suggestions.push({
        type: "refactor",
        priority: "medium",
        filePath: file.filePath,
        title: `Remove code duplication in ${file.fileName}`,
        description: `${file.duplicationPercentage}% of code is duplicated. Consider extracting to shared utilities.`,
        estimatedEffort: 45,
        potentialImpact: "Reduced maintenance cost and improved consistency",
        suggestedAction: "Extract duplicated code to reusable functions",
        autoFixAvailable: true,
      });
    }
  });

  return suggestions
    .sort((a, b) => {
      const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
    })
    .slice(0, 20); // Top 20 suggestions
};

module.exports = mongoose.model("ProjectHealth", ProjectHealthSchema);
