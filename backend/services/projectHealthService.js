const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");
const execAsync = promisify(exec);
const ProjectHealth = require("../models/ProjectHealth");

class ProjectHealthService {
  /**
   * Analyze project and create/update health record
   */
  async analyzeProject(userId, projectData, options = {}) {
    let projectHealth; // Declare outside try block for catch block access
    let cleanup = null;

    try {
      // Initialize project (clone if needed)
      const {
        projectId,
        projectPath,
        source,
        githubUrl,
        cleanup: cleanupFn,
      } = await this.initializeProject(userId, projectData);

      cleanup = cleanupFn;

      // Find or create project health record
      projectHealth = await ProjectHealth.findOne({
        userId,
        $or: [{ projectId }, { projectPath }],
      });

      if (!projectHealth) {
        projectHealth = new ProjectHealth({
          userId,
          projectId,
          projectPath,
          projectSource: source || "upload",
          githubUrl,
          projectName: path.basename(projectPath),
          analysisStatus: "analyzing",
        });
      } else {
        // Update existing record
        projectHealth.projectPath = projectPath; // Update path in case it changed
        projectHealth.analysisStatus = "analyzing";
        if (source) projectHealth.projectSource = source;
        if (githubUrl) projectHealth.githubUrl = githubUrl;
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

      // Clear existing recommendations first
      projectHealth.recommendations = [];

      // Generate new recommendations
      const newRecommendations = this.generateRecommendations(
        projectHealth,
        fileMetrics
      );

      // Add each recommendation individually
      newRecommendations.forEach((rec) => {
        projectHealth.recommendations.push(rec);
      });

      projectHealth.lastAnalyzed = new Date();
      projectHealth.analysisStatus = "completed";

      await projectHealth.save();

      // Cleanup if needed (e.g. delete cloned repo)
      // Note: For now we might want to keep it for a bit, but per requirements we should delete
      if (cleanup) {
        await cleanup();
      }

      return projectHealth;
    } catch (error) {
      console.error("Project analysis error:", error);

      if (projectHealth) {
        projectHealth.analysisStatus = "failed";
        projectHealth.analysisError = error.message;
        await projectHealth.save();
      }

      if (cleanup) {
        await cleanup();
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
        // Get the file content for this node
        const fullPath = path.join(projectPath, node.filePath);
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          const lines = content.split("\n");
          const functionContent = lines
            .slice(node.startLine - 1, node.endLine)
            .join("\n");

          const calls = this.extractFunctionCalls(functionContent);

          calls.forEach((calledFunc) => {
            if (functionMap.has(calledFunc)) {
              node.calls.push(calledFunc);
              functionMap.get(calledFunc).calledBy.push(node.functionName);
            }
          });
        } catch (error) {
          console.error(
            `Error reading function calls for ${node.filePath}: ${error.message}`
          );
        }
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
      ".next",
      "out",
      "target",
      "bin",
      "obj",
    ];

    try {
      // Check if projectPath exists
      await fs.access(projectPath);
    } catch (error) {
      console.error(`Project path does not exist: ${projectPath}`);
      return [];
    }

    async function traverse(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip hidden files and excluded directories
          if (entry.name.startsWith(".") && entry.name !== ".") {
            continue;
          }

          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
              await traverse(fullPath);
            }
          } else {
            const ext = path.extname(entry.name);
            // Support more file extensions
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
                ".h",
                ".hpp",
                ".cs",
                ".go",
                ".rs",
                ".rb",
                ".php",
              ].includes(ext)
            ) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(`Cannot read directory ${dir}: ${error.message}`);
      }
    }

    try {
      await traverse(projectPath);
    } catch (error) {
      console.error(`Error traversing project: ${error.message}`);
    }

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
      "switch",
    ];

    let complexity = 1;

    // Count keyword-based decision points
    decisionKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      const matches = content.match(regex);
      if (matches) complexity += matches.length;
    });

    // Count operators separately with proper escaping
    const operators = ["&&", "||", "\\?"];
    operators.forEach((op) => {
      const regex = new RegExp(op, "g");
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

  extractFunctionCalls(functionBody) {
    const calls = [];
    const callRegex = /(\w+)\s*\(/g;

    let match;
    while ((match = callRegex.exec(functionBody)) !== null) {
      const funcName = match[1];
      // Filter out common keywords that look like function calls
      if (
        !["if", "for", "while", "switch", "catch", "return"].includes(funcName)
      ) {
        calls.push(funcName);
      }
    }

    return [...new Set(calls)]; // Remove duplicates
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
   * Get project health by ID (supports both MongoDB _id and custom projectId)
   */
  async getProjectHealth(id) {
    // Try to find by custom projectId first
    let health = await ProjectHealth.findOne({ projectId: id });

    // If not found and it looks like a Mongo ID, try that
    if (!health && id.match(/^[0-9a-fA-F]{24}$/)) {
      health = await ProjectHealth.findById(id);
    }

    return health;
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

  /**
   * Generate recommendations based on file metrics
   */
  generateRecommendations(projectHealth, fileMetrics) {
    const suggestions = [];

    // High complexity files
    fileMetrics.forEach((file) => {
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
          status: "pending", // Add default status
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
          status: "pending",
        });
      }

      // Test failures
      if (file.testFailures && file.testFailures.length > 0) {
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
          status: "pending",
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
          status: "pending",
        });
      }
    });

    const sorted = suggestions
      .sort((a, b) => {
        const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
      })
      .slice(0, 20); // Top 20 suggestions

    // Return plain JavaScript array, not Mongoose document
    return JSON.parse(JSON.stringify(sorted));
  }

  /**
   * Clone a GitHub repository
   */
  async cloneRepository(repoUrl) {
    // Basic validation for GitHub URL
    if (!repoUrl.match(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/)) {
      throw new Error("Invalid GitHub repository URL");
    }

    const projectId = crypto.randomBytes(8).toString("hex");
    const clonePath = path.join(
      process.cwd(),
      "temp",
      "project-health",
      projectId
    );

    try {
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(clonePath), { recursive: true });

      // Clone repository
      await execAsync(`git clone --depth=1 ${repoUrl} ${clonePath}`);

      return {
        projectId,
        projectPath: clonePath,
        cleanup: async () => {
          try {
            await fs.rm(clonePath, { recursive: true, force: true });
          } catch (err) {
            console.error(`Failed to cleanup ${clonePath}:`, err);
          }
        },
      };
    } catch (error) {
      console.error("Clone repository error:", error);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Initialize a project for analysis
   */
  async initializeProject(userId, projectData) {
    // Extract projectPath directly, or fallback to path if provided
    const {
      source,
      projectPath,
      path: altPath,
      githubUrl,
      projectId,
    } = projectData;

    console.log(
      `[ProjectHealthService] Initializing project. Source: ${source}, GitHub: ${githubUrl}, Path: ${
        projectPath || altPath
      }`
    );

    // Use projectPath if available, otherwise use path (legacy support)
    const effectivePath = projectPath || altPath;

    let finalPath = effectivePath;
    let finalProjectId = projectId || crypto.randomBytes(8).toString("hex");

    if (source === "github" && githubUrl) {
      const cloneResult = await this.cloneRepository(githubUrl);
      finalPath = cloneResult.projectPath;
      finalProjectId = cloneResult.projectId;
    }

    // Ensure project path exists
    try {
      await fs.access(finalPath);
    } catch (error) {
      throw new Error(`Project path not found: ${finalPath}`);
    }

    return {
      projectId: finalProjectId,
      projectPath: finalPath,
      source,
      githubUrl,
    };
  }
}

module.exports = new ProjectHealthService();
