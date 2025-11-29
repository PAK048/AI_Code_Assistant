const fs = require("fs");
const path = require("path");
const metricsService = require("./metricsService");
const { callWatsonx } = require("./llmService");

const SANDBOX_PATH = path.resolve(__dirname, "../sandbox");

/**
 * Calculate metrics for multiple files
 * @param {array} filePaths - Array of file paths
 * @returns {Promise<object>} Aggregated metrics
 */
async function calculateMultiFileMetrics(filePaths) {
  console.log(`[Quality Metrics] Analyzing ${filePaths.length} files`);

  const results = [];
  const aggregated = {
    total_files: filePaths.length,
    total_lines: 0,
    total_code_lines: 0,
    avg_complexity: 0,
    avg_maintainability: 0,
    files_with_issues: 0,
    overall_quality: "Unknown",
  };

  for (const filePath of filePaths) {
    try {
      const fullPath = path.join(SANDBOX_PATH, filePath);

      if (!fs.existsSync(fullPath)) {
        console.warn(`[Quality Metrics] File not found: ${filePath}`);
        continue;
      }

      const code = fs.readFileSync(fullPath, "utf-8");
      const language = detectLanguage(filePath);
      const metrics = metricsService.calculateMetrics(code, language);

      results.push({
        filePath,
        language,
        metrics,
        hasIssues: metrics.overall_assessment.issues.length > 0,
      });

      // Aggregate
      aggregated.total_lines += metrics.lines_of_code.total;
      aggregated.total_code_lines += metrics.lines_of_code.code;
      aggregated.avg_complexity += metrics.cyclomatic_complexity.total;
      aggregated.avg_maintainability += metrics.maintainability_index.score;

      if (metrics.overall_assessment.issues.length > 0) {
        aggregated.files_with_issues++;
      }
    } catch (error) {
      console.error(`[Quality Metrics] Error analyzing ${filePath}:`, error);
      results.push({
        filePath,
        error: error.message,
        hasIssues: true,
      });
    }
  }

  // Calculate averages
  const validFiles = results.filter((r) => !r.error).length;
  if (validFiles > 0) {
    aggregated.avg_complexity = (
      aggregated.avg_complexity / validFiles
    ).toFixed(1);
    aggregated.avg_maintainability = (
      aggregated.avg_maintainability / validFiles
    ).toFixed(1);
  }

  // Determine overall quality
  aggregated.overall_quality = determineOverallQuality(aggregated, results);

  // Generate insights
  const insights = generateInsights(aggregated, results);

  console.log(
    `[Quality Metrics] Complete: ${validFiles} files analyzed, avg complexity ${aggregated.avg_complexity}, avg maintainability ${aggregated.avg_maintainability}`
  );

  return {
    success: true,
    aggregated,
    results,
    insights,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Track metrics over time (for trend analysis)
 */
async function trackMetricsHistory(filePaths, sessionId = "default") {
  const current = await calculateMultiFileMetrics(filePaths);

  // In production, save to database
  // For now, just return current metrics with timestamp

  return {
    session_id: sessionId,
    timestamp: current.timestamp,
    metrics: current,
    trend: {
      message: "Tracking started - run again to see trends",
    },
  };
}

/**
 * Get style compliance report
 */
async function getStyleCompliance(filePaths) {
  console.log(
    `[Quality Metrics] Checking style compliance for ${filePaths.length} files`
  );

  const issues = [];
  let totalIssues = 0;

  for (const filePath of filePaths) {
    try {
      const fullPath = path.join(SANDBOX_PATH, filePath);
      const code = fs.readFileSync(fullPath, "utf-8");
      const language = detectLanguage(filePath);

      const styleIssues = checkStyleCompliance(code, language);

      if (styleIssues.length > 0) {
        issues.push({
          filePath,
          language,
          issues: styleIssues,
        });
        totalIssues += styleIssues.length;
      }
    } catch (error) {
      console.error(
        `[Quality Metrics] Style check error for ${filePath}:`,
        error
      );
    }
  }

  return {
    success: true,
    total_files: filePaths.length,
    files_with_issues: issues.length,
    total_issues: totalIssues,
    compliance_rate: (
      ((filePaths.length - issues.length) / filePaths.length) *
      100
    ).toFixed(1),
    issues,
  };
}

/**
 * Check style compliance for a single file
 */
function checkStyleCompliance(code, language) {
  const issues = [];
  const lines = code.split("\n");

  // Common style checks

  // 1. Line length
  lines.forEach((line, idx) => {
    if (line.length > 120) {
      issues.push({
        line: idx + 1,
        type: "line_length",
        severity: "warning",
        message: `Line exceeds 120 characters (${line.length})`,
      });
    }
  });

  // 2. Indentation consistency
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^[\s]*/)?.[0].length || 0);

  const hasSpaces = indents.some((i) => i % 2 === 1);
  const hasTabs = code.includes("\t");

  if (hasSpaces && hasTabs) {
    issues.push({
      line: 0,
      type: "mixed_indentation",
      severity: "error",
      message: "Mixed spaces and tabs for indentation",
    });
  }

  // 3. Trailing whitespace
  lines.forEach((line, idx) => {
    if (line.endsWith(" ") || line.endsWith("\t")) {
      issues.push({
        line: idx + 1,
        type: "trailing_whitespace",
        severity: "info",
        message: "Trailing whitespace",
      });
    }
  });

  // 4. Missing final newline
  if (code.length > 0 && !code.endsWith("\n")) {
    issues.push({
      line: lines.length,
      type: "no_final_newline",
      severity: "info",
      message: "File should end with a newline",
    });
  }

  // 5. Language-specific checks
  if (language === "JavaScript" || language === "TypeScript") {
    // Check for semicolons
    const missingSemicolons = (code.match(/\n[^/\n]*[^;\s\n]\s*\n/g) || [])
      .length;
    if (missingSemicolons > 5) {
      issues.push({
        line: 0,
        type: "missing_semicolons",
        severity: "warning",
        message: `Possible ${missingSemicolons} missing semicolons`,
      });
    }

    // Check for var usage (prefer const/let)
    const varMatches = code.match(/\bvar\s+/g);
    if (varMatches && varMatches.length > 0) {
      issues.push({
        line: 0,
        type: "var_usage",
        severity: "warning",
        message: `Found ${varMatches.length} var declarations - prefer const/let`,
      });
    }
  } else if (language === "Python") {
    // Check for snake_case
    const camelCaseVars = code.match(/\b[a-z][a-zA-Z0-9]+\s*=/g);
    if (camelCaseVars && camelCaseVars.length > 3) {
      issues.push({
        line: 0,
        type: "naming_convention",
        severity: "info",
        message: "Python prefers snake_case for variables",
      });
    }
  }

  return issues;
}

/**
 * Generate AI-powered insights
 */
async function generateAIInsights(aggregated, results) {
  console.log("[Quality Metrics] Generating AI insights...");

  const summary = {
    total_files: aggregated.total_files,
    avg_complexity: aggregated.avg_complexity,
    avg_maintainability: aggregated.avg_maintainability,
    files_with_issues: aggregated.files_with_issues,
  };

  const topIssues = results
    .filter((r) => r.metrics && r.hasIssues)
    .slice(0, 5)
    .map((r) => ({
      file: r.filePath,
      issues: r.metrics.overall_assessment.issues,
    }));

  const prompt = `You are a code quality expert. Analyze the following code quality metrics and provide actionable insights.

OVERALL METRICS:
- Total Files: ${summary.total_files}
- Average Complexity: ${summary.avg_complexity}
- Average Maintainability: ${summary.avg_maintainability}/100
- Files with Issues: ${summary.files_with_issues}

TOP ISSUES:
${JSON.stringify(topIssues, null, 2)}

Provide a concise analysis in JSON format:
{
  "overall_assessment": "Brief overall quality assessment",
  "top_priorities": [
    {
      "priority": "Priority level",
      "issue": "Issue description",
      "recommendation": "What to do"
    }
  ],
  "positive_aspects": ["List good practices observed"],
  "improvement_areas": ["List areas needing improvement"]
}

Provide ONLY the JSON response.`;

  try {
    const { text } = await callWatsonx(prompt, {
      maxNewTokens: 800,
      temperature: 0.3,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("[Quality Metrics] AI insights generation failed:", error);
  }

  return {
    overall_assessment: "Metrics calculated successfully",
    top_priorities: [],
    positive_aspects: [],
    improvement_areas: [],
  };
}

/**
 * Determine overall quality rating
 */
function determineOverallQuality(aggregated, results) {
  const avgMaintainability = parseFloat(aggregated.avg_maintainability);
  const avgComplexity = parseFloat(aggregated.avg_complexity);
  const issueRate = aggregated.files_with_issues / aggregated.total_files;

  if (avgMaintainability >= 80 && avgComplexity <= 10 && issueRate < 0.2) {
    return "Excellent";
  } else if (
    avgMaintainability >= 65 &&
    avgComplexity <= 20 &&
    issueRate < 0.4
  ) {
    return "Good";
  } else if (
    avgMaintainability >= 50 &&
    avgComplexity <= 30 &&
    issueRate < 0.6
  ) {
    return "Fair";
  } else {
    return "Needs Improvement";
  }
}

/**
 * Generate insights from metrics
 */
function generateInsights(aggregated, results) {
  const insights = [];

  // Complexity insights
  if (parseFloat(aggregated.avg_complexity) > 20) {
    insights.push({
      type: "warning",
      category: "complexity",
      message: "High average complexity detected",
      recommendation: "Consider refactoring complex functions",
    });
  }

  // Maintainability insights
  if (parseFloat(aggregated.avg_maintainability) < 50) {
    insights.push({
      type: "error",
      category: "maintainability",
      message: "Low maintainability index",
      recommendation:
        "Urgent refactoring needed to improve code maintainability",
    });
  }

  // Issue insights
  if (aggregated.files_with_issues > aggregated.total_files * 0.5) {
    insights.push({
      type: "warning",
      category: "quality",
      message: "More than 50% of files have quality issues",
      recommendation: "Address common issues across the codebase",
    });
  }

  // Positive insights
  if (parseFloat(aggregated.avg_maintainability) >= 80) {
    insights.push({
      type: "success",
      category: "maintainability",
      message: "Excellent maintainability score",
      recommendation: "Keep up the good practices",
    });
  }

  return insights;
}

/**
 * Detect programming language
 */
function detectLanguage(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const languageMap = {
    js: "JavaScript",
    jsx: "React JSX",
    ts: "TypeScript",
    tsx: "React TSX",
    py: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    go: "Go",
    rb: "Ruby",
    php: "PHP",
    cs: "C#",
  };
  return languageMap[ext] || "Unknown";
}

/**
 * Get list of all source files in sandbox
 */
function findAllSourceFiles() {
  const sourceFiles = [];

  function scanDirectory(dir) {
    const fullDirPath = path.join(SANDBOX_PATH, dir);

    if (!fs.existsSync(fullDirPath)) {
      return;
    }

    const files = fs.readdirSync(fullDirPath);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const fullPath = path.join(SANDBOX_PATH, filePath);

      try {
        const stat = fs.statSync(fullPath);

        if (
          stat.isDirectory() &&
          !file.startsWith(".") &&
          file !== "node_modules" &&
          file !== "__pycache__"
        ) {
          scanDirectory(filePath);
        } else if (stat.isFile() && isSourceFile(file) && !isTestFile(file)) {
          sourceFiles.push(filePath);
        }
      } catch (error) {
        console.error(
          `[Quality Metrics] Error scanning ${filePath}:`,
          error.message
        );
      }
    }
  }

  scanDirectory("");
  return sourceFiles;
}

/**
 * Check if file is a source file
 */
function isSourceFile(fileName) {
  return /\.(js|jsx|ts|tsx|py|java|cpp|c|go|rb|php|cs)$/.test(fileName);
}

/**
 * Check if file is a test file
 */
function isTestFile(fileName) {
  return (
    /\.(test|spec)\.(js|jsx|ts|tsx|py|java|cpp|rb|php)$/.test(fileName) ||
    /^test_.*\.(py|rb)$/.test(fileName)
  );
}

module.exports = {
  calculateMultiFileMetrics,
  trackMetricsHistory,
  getStyleCompliance,
  generateAIInsights,
  findAllSourceFiles,
};
