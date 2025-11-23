const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const ProjectHealth = require("../models/ProjectHealth");

class ProjectHealthService {
  /**
   * Analyze project and create/update health record
   */
  async analyzeProject(userId, projectPath, options = {}) {
    try {
      // Find or create project health record
      let projectHealth = await ProjectHealth.findOne({ userId, projectPath });

      if (!projectHealth) {
        projectHealth = new ProjectHealth({
          userId,
          projectPath,
          projectName: path.basename(projectPath),
          analysisStatus: "analyzing",
        });
      } else {
        projectHealth.analysisStatus = "analyzing";
      }

      await projectHealth.save();

      // Perform analyses in parallel for efficiency
      const [
        gitStatus,
        fileMetrics,
        callGraph,
        duplications,
        testResults,
        languageStats,
      ] = await Promise.all([
        this.analyzeGitStatus(projectPath),
        this.analyzeFiles(projectPath, options.filePatterns),
        this.buildCallGraph(projectPath),
        this.detectDuplications(projectPath),
        this.analyzeTests(projectPath),
        this.analyzeLanguageDistribution(projectPath),
      ]);

      // Update project health
      projectHealth.currentBranch = gitStatus.currentBranch;
      projectHealth.isDirty = gitStatus.isDirty;
      projectHealth.uncommittedChanges = gitStatus.uncommittedChanges;
      projectHealth.pendingPRs = gitStatus.pendingPRs || [];
      projectHealth.branches = gitStatus.branches || [];

      projectHealth.files = fileMetrics;
      projectHealth.totalFiles = fileMetrics.length;
      projectHealth.totalLinesOfCode = fileMetrics.reduce(
        (sum, f) => sum + (f.linesOfCode || 0),
        0
      );

      projectHealth.callGraph = callGraph;
      projectHealth.duplications = duplications;
      projectHealth.testSummary = testResults;
      projectHealth.languages = languageStats;

      // Calculate overall metrics
      projectHealth.overallMetrics = this.calculateOverallMetrics(
        fileMetrics,
        duplications
      );

      // Generate AI recommendations
      projectHealth.recommendations =
        projectHealth.generateRefactoringSuggestions();

      projectHealth.lastAnalyzed = new Date();
      projectHealth.analysisStatus = "completed";

      await projectHealth.save();

      return projectHealth;
    } catch (error) {
      console.error("Project analysis error:", error);

      if (projectHealth) {
        projectHealth.analysisStatus = "failed";
        projectHealth.analysisError = error.message;
        await projectHealth.save();
      }

      throw error;
    }
  }

  /**
   * Analyze Git status, branches, and PRs
   */
  async analyzeGitStatus(projectPath) {
    try {
      const gitDir = path.join(projectPath, ".git");
      const hasGit = await fs
        .access(gitDir)
        .then(() => true)
        .catch(() => false);

      if (!hasGit) {
        return { currentBranch: null, isDirty: false, uncommittedChanges: 0 };
      }

      // Get current branch
      const { stdout: branchOut } = await execAsync(
        "git branch --show-current",
        { cwd: projectPath }
      );
      const currentBranch = branchOut.trim();

      // Check if dirty
      const { stdout: statusOut } = await execAsync("git status --porcelain", {
        cwd: projectPath,
      });
      const isDirty = statusOut.length > 0;
      const uncommittedChanges = statusOut
        .split("\n")
        .filter((line) => line.trim()).length;

      // Get all branches
      const { stdout: branchesOut } = await execAsync("git branch -a", {
        cwd: projectPath,
      });
      const branches = branchesOut
        .split("\n")
        .filter((line) => line.trim() && !line.includes("HEAD"))
        .map((line) => ({
          name: line.replace("*", "").trim().replace("remotes/origin/", ""),
          lastCommit: new Date(),
          behind: 0,
          ahead: 0,
        }));

      // Note: PR detection requires GitHub API or similar - placeholder here
      const pendingPRs = [];

      return {
        currentBranch,
        isDirty,
        uncommittedChanges,
        branches,
        pendingPRs,
      };
    } catch (error) {
      console.error("Git analysis error:", error);
      return { currentBranch: null, isDirty: false, uncommittedChanges: 0 };
    }
  }

  /**
   * Analyze individual files for metrics
   */
  async analyzeFiles(
    projectPath,
    filePatterns = ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.py"]
  ) {
    const fileMetrics = [];

    try {
      const files = await this.findFiles(projectPath, filePatterns);

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const relativePath = path.relative(projectPath, filePath);
          const language = this.detectLanguage(filePath);

          const metrics = {
            filePath: relativePath,
            fileName: path.basename(filePath),
            language,
            size: content.length,
            linesOfCode: content.split("\n").length,
            cyclomaticComplexity: this.calculateComplexity(content, language),
            cognitiveComplexity: this.calculateCognitiveComplexity(
              content,
              language
            ),
            maintainabilityIndex: this.calculateMaintainabilityIndex(
              content,
              language
            ),
            halsteadMetrics: this.calculateHalsteadMetrics(content, language),
            duplicationPercentage: 0, // Will be calculated in detectDuplications
            commentDensity: this.calculateCommentDensity(content, language),
            codeSmells: this.detectCodeSmells(content, language).length,
            technicalDebt: this.estimateTechnicalDebt(content, language),
            testCoverage: 0, // Will be updated from test results
            testCount: 0,
            testFailures: [],
            imports: this.extractImports(content, language),
            exports: this.extractExports(content, language),
            dependencies: [],
            lastAnalyzed: new Date(),
          };

          fileMetrics.push(metrics);
        } catch (error) {
          console.error(`Error analyzing file ${filePath}:`, error);
        }
      }

      return fileMetrics;
    } catch (error) {
      console.error("File analysis error:", error);
      return [];
    }
  }

  /**
   * Build call graph using graph traversal (DFS)
   */
  async buildCallGraph(projectPath) {
    const callGraph = [];
    const functionMap = new Map(); // functionName -> node

    try {
      const files = await this.findFiles(projectPath, [
        "**/*.js",
        "**/*.jsx",
        "**/*.ts",
        "**/*.tsx",
      ]);

      // First pass: Extract all functions
      for (const filePath of files) {
        const content = await fs.readFile(filePath, "utf-8");
        const functions = this.extractFunctions(content, filePath);

        functions.forEach((func) => {
          const node = {
            functionName: func.name,
            filePath: path.relative(projectPath, filePath),
            startLine: func.startLine,
            endLine: func.endLine,
            calls: [],
            calledBy: [],
            complexity: this.calculateFunctionComplexity(func.body),
            linesOfCode: func.body.split("\n").length,
            parameters: func.params.length,
            depth: 0,
          };

          functionMap.set(func.name, node);
          callGraph.push(node);
        });
      }

      // Second pass: Build call relationships
      for (const node of callGraph) {
        const calls = this.extractFunctionCalls(node);

        calls.forEach((calledFunc) => {
          if (functionMap.has(calledFunc)) {
            node.calls.push(calledFunc);
            functionMap.get(calledFunc).calledBy.push(node.functionName);
          }
        });
      }

      // Calculate call depth using DFS
      this.calculateCallDepth(callGraph, functionMap);

      return callGraph;
    } catch (error) {
      console.error("Call graph error:", error);
      return [];
    }
  }

  /**
   * Detect code duplications using hash maps
   */
  async detectDuplications(projectPath) {
    const duplications = [];
    const codeBlockMap = new Map(); // hash -> [file locations]
    const minBlockSize = 5; // Minimum lines to consider as duplication

    try {
      const files = await this.findFiles(projectPath, [
        "**/*.js",
        "**/*.jsx",
        "**/*.ts",
        "**/*.tsx",
        "**/*.py",
      ]);

      for (const filePath of files) {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");

        // Sliding window to detect duplicate blocks
        for (let i = 0; i <= lines.length - minBlockSize; i++) {
          const block = lines
            .slice(i, i + minBlockSize)
            .join("\n")
            .trim();

          if (block.length < 50) continue; // Skip trivial blocks

          const hash = this.hashCode(block);

          if (!codeBlockMap.has(hash)) {
            codeBlockMap.set(hash, []);
          }

          codeBlockMap.get(hash).push({
            filePath: path.relative(projectPath, filePath),
            startLine: i + 1,
            endLine: i + minBlockSize,
            code: block,
          });
        }
      }

      // Identify duplications (hash with 2+ occurrences)
      codeBlockMap.forEach((locations, hash) => {
        if (locations.length > 1) {
          const severity =
            locations.length > 3
              ? "high"
              : locations.length > 2
              ? "medium"
              : "low";

          duplications.push({
            hash,
            code: locations[0].code.substring(0, 200), // First 200 chars
            files: locations.map((loc) => ({
              filePath: loc.filePath,
              startLine: loc.startLine,
              endLine: loc.endLine,
            })),
            severity,
          });
        }
      });

      return duplications;
    } catch (error) {
      console.error("Duplication detection error:", error);
      return [];
    }
  }

  /**
   * Analyze test results
   */
  async analyzeTests(projectPath) {
    const testSummary = {
      totalTests: 0,
      passing: 0,
      failing: 0,
      skipped: 0,
      lastRunAt: new Date(),
      duration: 0,
    };

    try {
      // Try to find test results (Jest, Mocha, Pytest, etc.)
      const testResultsPath = path.join(projectPath, "test-results.json");
      const jestResultsPath = path.join(
        projectPath,
        "coverage",
        "coverage-summary.json"
      );

      // Check if test results exist
      let hasTestResults = await fs
        .access(testResultsPath)
        .then(() => true)
        .catch(() => false);

      if (hasTestResults) {
        const results = JSON.parse(await fs.readFile(testResultsPath, "utf-8"));
        testSummary.totalTests = results.numTotalTests || 0;
        testSummary.passing = results.numPassedTests || 0;
        testSummary.failing = results.numFailedTests || 0;
        testSummary.skipped = results.numPendingTests || 0;
        testSummary.duration =
          results.testResults?.reduce(
            (sum, r) => sum + (r.endTime - r.startTime),
            0
          ) || 0;
      }

      return testSummary;
    } catch (error) {
      console.error("Test analysis error:", error);
      return testSummary;
    }
  }

  /**
   * Analyze language distribution
   */
  async analyzeLanguageDistribution(projectPath) {
    const languageMap = new Map();

    try {
      const files = await this.findFiles(projectPath, ["**/*.*"]);

      for (const filePath of files) {
        const language = this.detectLanguage(filePath);
        const content = await fs.readFile(filePath, "utf-8");
        const linesOfCode = content.split("\n").length;

        if (!languageMap.has(language)) {
          languageMap.set(language, { filesCount: 0, linesOfCode: 0 });
        }

        const stats = languageMap.get(language);
        stats.filesCount++;
        stats.linesOfCode += linesOfCode;
      }

      const totalLOC = Array.from(languageMap.values()).reduce(
        (sum, stat) => sum + stat.linesOfCode,
        0
      );

      return Array.from(languageMap.entries()).map(([language, stats]) => ({
        language,
        filesCount: stats.filesCount,
        linesOfCode: stats.linesOfCode,
        percentage: totalLOC > 0 ? (stats.linesOfCode / totalLOC) * 100 : 0,
      }));
    } catch (error) {
      console.error("Language analysis error:", error);
      return [];
    }
  }

  /**
   * Calculate overall metrics from file metrics
   */
  calculateOverallMetrics(fileMetrics, duplications) {
    if (fileMetrics.length === 0) {
      return {
        avgComplexity: 0,
        avgMaintainability: 0,
        totalTechnicalDebt: 0,
        totalCodeSmells: 0,
        overallTestCoverage: 0,
        defectDensity: 0,
        duplicationPercentage: 0,
      };
    }

    const totalLOC = fileMetrics.reduce(
      (sum, f) => sum + (f.linesOfCode || 0),
      0
    );
    const totalDuplicatedLOC = duplications.reduce(
      (sum, d) => sum + d.files.length * 5,
      0
    ); // Estimate

    return {
      avgComplexity:
        fileMetrics.reduce((sum, f) => sum + f.cyclomaticComplexity, 0) /
        fileMetrics.length,
      avgMaintainability:
        fileMetrics.reduce((sum, f) => sum + f.maintainabilityIndex, 0) /
        fileMetrics.length,
      totalTechnicalDebt: fileMetrics.reduce(
        (sum, f) => sum + f.technicalDebt,
        0
      ),
      totalCodeSmells: fileMetrics.reduce((sum, f) => sum + f.codeSmells, 0),
      overallTestCoverage:
        fileMetrics.reduce((sum, f) => sum + f.testCoverage, 0) /
        fileMetrics.length,
      defectDensity:
        totalLOC > 0
          ? (fileMetrics.reduce((sum, f) => sum + f.testFailures.length, 0) /
              totalLOC) *
            1000
          : 0,
      duplicationPercentage:
        totalLOC > 0 ? (totalDuplicatedLOC / totalLOC) * 100 : 0,
    };
  }

  // ==================== Helper Methods ====================

  async findFiles(projectPath, patterns) {
    const files = [];
    const excludeDirs = [
      "node_modules",
      ".git",
      "dist",
      "build",
      "coverage",
      "__pycache__",
    ];

    async function traverse(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            await traverse(fullPath);
          }
        } else {
          const ext = path.extname(entry.name);
          if (
            [
              ".js",
              ".jsx",
              ".ts",
              ".tsx",
              ".py",
              ".java",
              ".cpp",
              ".c",
            ].includes(ext)
          ) {
            files.push(fullPath);
          }
        }
      }
    }

    await traverse(projectPath);
    return files;
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath);
    const langMap = {
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".ts": "TypeScript",
      ".tsx": "TypeScript",
      ".py": "Python",
      ".java": "Java",
      ".cpp": "C++",
      ".c": "C",
      ".go": "Go",
      ".rs": "Rust",
    };
    return langMap[ext] || "Unknown";
  }

  calculateComplexity(content, language) {
    // Cyclomatic complexity = 1 + number of decision points
    const decisionKeywords = [
      "if",
      "else",
      "for",
      "while",
      "case",
      "catch",
      "&&",
      "||",
      "?",
      "switch",
    ];

    let complexity = 1;
    decisionKeywords.forEach((keyword) => {
      const regex = new RegExp(
        `\\b${keyword}\\b|${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g"
      );
      const matches = content.match(regex);
      if (matches) complexity += matches.length;
    });

    return Math.min(complexity, 50); // Cap at 50
  }

  calculateCognitiveComplexity(content, language) {
    // Simplified cognitive complexity
    let complexity = 0;
    let nestingLevel = 0;

    const lines = content.split("\n");
    for (const line of lines) {
      if (line.includes("{")) nestingLevel++;
      if (line.includes("}")) nestingLevel = Math.max(0, nestingLevel - 1);

      if (/\b(if|for|while|catch|switch)\b/.test(line)) {
        complexity += 1 + nestingLevel;
      }
    }

    return Math.min(complexity, 50);
  }

  calculateMaintainabilityIndex(content, language) {
    // Simplified maintainability index (0-100, higher is better)
    const loc = content.split("\n").length;
    const complexity = this.calculateComplexity(content, language);
    const commentDensity = this.calculateCommentDensity(content, language);

    // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
    // Simplified version
    const mi =
      100 - complexity * 2 - (loc > 100 ? 10 : 0) + commentDensity * 0.5;

    return Math.max(0, Math.min(100, mi));
  }

  calculateHalsteadMetrics(content, language) {
    // Simplified Halstead metrics
    const operators = content.match(/[+\-*/%=<>!&|^~?:]/g) || [];
    const operands = content.match(/\b[a-zA-Z_]\w*\b/g) || [];

    const n1 = new Set(operators).size;
    const n2 = new Set(operands).size;
    const N1 = operators.length;
    const N2 = operands.length;

    const vocabulary = n1 + n2;
    const length = N1 + N2;
    const volume = length * Math.log2(vocabulary || 1);
    const difficulty = (n1 / 2) * (N2 / (n2 || 1));
    const effort = volume * difficulty;
    const bugs = volume / 3000; // Halstead's delivered bugs estimate

    return {
      volume: Math.round(volume),
      difficulty: Math.round(difficulty * 100) / 100,
      effort: Math.round(effort),
      bugs: Math.round(bugs * 100) / 100,
    };
  }

  calculateCommentDensity(content, language) {
    const lines = content.split("\n");
    let commentLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("*")
      ) {
        commentLines++;
      }
    }

    return lines.length > 0 ? (commentLines / lines.length) * 100 : 0;
  }

  detectCodeSmells(content, language) {
    const smells = [];
    const lines = content.split("\n");

    // Long function (>50 lines)
    if (lines.length > 50) {
      smells.push({ type: "long_function", severity: "medium" });
    }

    // Too many parameters
    const functionMatches = content.match(/function\s+\w+\s*\(([^)]*)\)/g);
    if (functionMatches) {
      functionMatches.forEach((match) => {
        const params = match
          .match(/\(([^)]*)\)/)[1]
          .split(",")
          .filter((p) => p.trim());
        if (params.length > 5) {
          smells.push({ type: "too_many_parameters", severity: "medium" });
        }
      });
    }

    // Magic numbers
    const magicNumbers = content.match(/\b\d{3,}\b/g);
    if (magicNumbers && magicNumbers.length > 3) {
      smells.push({ type: "magic_numbers", severity: "low" });
    }

    return smells;
  }

  estimateTechnicalDebt(content, language) {
    // Estimate in minutes based on complexity and code smells
    const complexity = this.calculateComplexity(content, language);
    const smells = this.detectCodeSmells(content, language);

    return complexity * 2 + smells.length * 10;
  }

  extractImports(content, language) {
    const imports = [];

    if (language === "JavaScript" || language === "TypeScript") {
      const importMatches = content.match(
        /import\s+.*\s+from\s+['"]([^'"]+)['"]/g
      );
      if (importMatches) {
        importMatches.forEach((match) => {
          const module = match.match(/from\s+['"]([^'"]+)['"]/)[1];
          imports.push(module);
        });
      }
    } else if (language === "Python") {
      const importMatches = content.match(
        /(?:from\s+(\S+)\s+)?import\s+(\S+)/g
      );
      if (importMatches) {
        importMatches.forEach((match) => {
          imports.push(match.split(/\s+/)[1]);
        });
      }
    }

    return imports;
  }

  extractExports(content, language) {
    const exports = [];

    if (language === "JavaScript" || language === "TypeScript") {
      const exportMatches = content.match(
        /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g
      );
      if (exportMatches) {
        exportMatches.forEach((match) => {
          const name = match.match(/(\w+)$/)[1];
          exports.push(name);
        });
      }
    }

    return exports;
  }

  extractFunctions(content, filePath) {
    const functions = [];
    const functionRegex =
      /(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:\([^)]*\)|function\s*\([^)]*\))\s*(?:=>)?\s*{/g;

    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const startLine = content.substring(0, match.index).split("\n").length;

      // Find end of function (simplified - just find matching brace)
      let braceCount = 1;
      let endIndex = match.index + match[0].length;

      while (braceCount > 0 && endIndex < content.length) {
        if (content[endIndex] === "{") braceCount++;
        if (content[endIndex] === "}") braceCount--;
        endIndex++;
      }

      const endLine = content.substring(0, endIndex).split("\n").length;
      const body = content.substring(match.index, endIndex);

      functions.push({
        name,
        startLine,
        endLine,
        body,
        params: match[0]
          .match(/\(([^)]*)\)/)[1]
          .split(",")
          .filter((p) => p.trim()),
      });
    }

    return functions;
  }

  extractFunctionCalls(node) {
    const calls = [];
    const callRegex = /(\w+)\s*\(/g;

    let match;
    while ((match = callRegex.exec(node.body || "")) !== null) {
      calls.push(match[1]);
    }

    return calls;
  }

  calculateCallDepth(callGraph, functionMap) {
    const visited = new Set();

    function dfs(funcName, depth) {
      if (visited.has(funcName)) return;
      visited.add(funcName);

      const node = functionMap.get(funcName);
      if (!node) return;

      node.depth = Math.max(node.depth, depth);

      node.calls.forEach((calledFunc) => {
        dfs(calledFunc, depth + 1);
      });
    }

    // Start DFS from entry points (functions not called by others)
    callGraph.forEach((node) => {
      if (node.calledBy.length === 0) {
        dfs(node.functionName, 0);
      }
    });
  }

  calculateFunctionComplexity(functionBody) {
    return this.calculateComplexity(functionBody, "JavaScript");
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get project health by ID
   */
  async getProjectHealth(projectHealthId) {
    return await ProjectHealth.findById(projectHealthId);
  }

  /**
   * Get project health by path
   */
  async getProjectHealthByPath(userId, projectPath) {
    return await ProjectHealth.findOne({ userId, projectPath });
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(
    projectHealthId,
    recommendationIndex,
    status
  ) {
    const projectHealth = await ProjectHealth.findById(projectHealthId);

    if (projectHealth && projectHealth.recommendations[recommendationIndex]) {
      projectHealth.recommendations[recommendationIndex].status = status;

      if (status === "completed") {
        projectHealth.recommendations[recommendationIndex].appliedAt =
          new Date();
      }

      await projectHealth.save();
    }

    return projectHealth;
  }

  /**
   * Add custom recommendation
   */
  async addRecommendation(projectHealthId, recommendation) {
    const projectHealth = await ProjectHealth.findById(projectHealthId);

    if (projectHealth) {
      projectHealth.recommendations.push(recommendation);
      await projectHealth.save();
    }

    return projectHealth;
  }
}

module.exports = new ProjectHealthService();
