const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const SANDBOX_PATH = path.resolve(__dirname, "../sandbox");

/**
 * Execute tests for multiple files
 * @param {array} filePaths - Array of file paths to test
 * @param {object} options - Test execution options
 * @returns {Promise<object>} Test results with coverage
 */
async function runMultiFileTests(filePaths, options = {}) {
  console.log(`[Test Runner] Running tests for ${filePaths.length} files`);

  const {
    framework = "auto",
    coverage = true,
    verbose = false,
    projectPath,
  } = options;

  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const filePath of filePaths) {
    try {
      const result = await runSingleFileTest(filePath, {
        framework,
        coverage,
        verbose,
        projectPath,
      });
      results.push(result);

      totalTests += result.tests.total;
      passedTests += result.tests.passed;
      failedTests += result.tests.failed;
    } catch (error) {
      results.push({
        filePath,
        success: false,
        error: error.message,
        tests: { total: 0, passed: 0, failed: 0 },
      });
    }
  }

  // Aggregate coverage
  const avgCoverage = coverage ? calculateAverageCoverage(results) : null;

  console.log(
    `[Test Runner] Complete: ${passedTests}/${totalTests} passed, ${failedTests} failed`
  );

  return {
    success: failedTests === 0,
    summary: {
      total_files: filePaths.length,
      total_tests: totalTests,
      passed: passedTests,
      failed: failedTests,
      success_rate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    },
    coverage: avgCoverage,
    results,
  };
}

/**
 * Run tests for a single file
 */
async function runSingleFileTest(filePath, options = {}) {
  console.log(`[Test Runner] Testing ${filePath}`);

  const { framework, coverage, verbose, projectPath } = options;
  const language = detectLanguage(filePath);
  const testFramework =
    framework === "auto" ? detectTestFramework(language) : framework;

  // Find or generate test file path
  const testFilePath = findTestFile(filePath);

  if (!testFilePath) {
    return {
      filePath,
      success: false,
      error: "No test file found",
      tests: { total: 0, passed: 0, failed: 0 },
      skipped: true,
    };
  }

  // Execute tests based on framework
  const command = buildTestCommand(
    testFilePath,
    testFramework,
    coverage,
    language
  );

  const cwd = projectPath || SANDBOX_PATH;

  return new Promise((resolve) => {
    exec(command, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
      const result = parseTestOutput(stdout, stderr, testFramework);

      resolve({
        filePath,
        testFilePath,
        success: !error && result.tests.failed === 0,
        framework: testFramework,
        language,
        tests: result.tests,
        coverage: result.coverage,
        output: verbose ? stdout : null,
        errors: error ? stderr : null,
        duration: result.duration,
      });
    });
  });
}

/**
 * Build test command based on framework
 */
function buildTestCommand(testFilePath, framework, coverage, language) {
  const commands = {
    Jest: coverage
      ? `npx jest ${testFilePath} --coverage --json --outputFile=test-results.json`
      : `npx jest ${testFilePath}`,
    pytest: coverage
      ? `pytest ${testFilePath} --cov --cov-report=json --json-report --json-report-file=test-results.json`
      : `pytest ${testFilePath}`,
    JUnit: `mvn test -Dtest=${path.basename(testFilePath, ".java")}`,
    Mocha: `npx mocha ${testFilePath}`,
    "Google Test": `./run_tests --gtest_filter=*`,
    RSpec: `rspec ${testFilePath}`,
    PHPUnit: `phpunit ${testFilePath}`,
  };

  return commands[framework] || commands.Jest;
}

/**
 * Parse test output based on framework
 */
function parseTestOutput(stdout, stderr, framework) {
  const result = {
    tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
    coverage: null,
    duration: 0,
  };

  try {
    if (framework === "Jest") {
      // Parse Jest output
      const passMatch = stdout.match(/(\d+) passed/);
      const failMatch = stdout.match(/(\d+) failed/);
      const totalMatch = stdout.match(/Tests:\s+(\d+)/);
      const durationMatch = stdout.match(/Time:\s+([\d.]+)s/);

      result.tests.passed = passMatch ? parseInt(passMatch[1]) : 0;
      result.tests.failed = failMatch ? parseInt(failMatch[1]) : 0;
      result.tests.total = totalMatch
        ? parseInt(totalMatch[1])
        : result.tests.passed + result.tests.failed;
      result.duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

      // Try to parse coverage
      const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)/);
      if (coverageMatch) {
        result.coverage = {
          lines: parseFloat(coverageMatch[1]),
          statements: parseFloat(coverageMatch[1]),
          functions: parseFloat(coverageMatch[1]),
          branches: parseFloat(coverageMatch[1]),
        };
      }
    } else if (framework === "pytest") {
      // Parse pytest output
      const match = stdout.match(/(\d+) passed(?:, (\d+) failed)?/);
      if (match) {
        result.tests.passed = parseInt(match[1]);
        result.tests.failed = match[2] ? parseInt(match[2]) : 0;
        result.tests.total = result.tests.passed + result.tests.failed;
      }

      // Parse coverage if available
      const covMatch = stdout.match(/TOTAL\s+\d+\s+\d+\s+([\d]+)%/);
      if (covMatch) {
        result.coverage = {
          lines: parseFloat(covMatch[1]),
        };
      }
    } else {
      // Generic parsing
      result.tests.total = (stdout.match(/test/gi) || []).length;
      result.tests.passed = (stdout.match(/pass|ok|\✓/gi) || []).length;
      result.tests.failed = (stdout.match(/fail|error|\✗/gi) || []).length;
    }
  } catch (error) {
    console.error("[Test Runner] Parse error:", error);
  }

  return result;
}

/**
 * Find test file for a source file
 */
function findTestFile(filePath) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const dirName = path.dirname(filePath);

  // Common test file patterns
  const patterns = [
    `${baseName}.test${path.extname(filePath)}`,
    `${baseName}.spec${path.extname(filePath)}`,
    `${baseName}_test${path.extname(filePath)}`,
    `test_${baseName}${path.extname(filePath)}`,
    path.join(dirName, "tests", `${baseName}.test${path.extname(filePath)}`),
    path.join(
      dirName,
      "__tests__",
      `${baseName}.test${path.extname(filePath)}`
    ),
  ];

  for (const pattern of patterns) {
    const fullPath = path.join(SANDBOX_PATH, pattern);
    if (fs.existsSync(fullPath)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Calculate average coverage across results
 */
function calculateAverageCoverage(results) {
  const coverageResults = results.filter((r) => r.coverage);

  if (coverageResults.length === 0) {
    return null;
  }

  const totals = {
    lines: 0,
    statements: 0,
    functions: 0,
    branches: 0,
  };

  coverageResults.forEach((result) => {
    if (result.coverage.lines) totals.lines += result.coverage.lines;
    if (result.coverage.statements)
      totals.statements += result.coverage.statements;
    if (result.coverage.functions)
      totals.functions += result.coverage.functions;
    if (result.coverage.branches) totals.branches += result.coverage.branches;
  });

  const count = coverageResults.length;

  return {
    lines: (totals.lines / count).toFixed(1),
    statements: (totals.statements / count).toFixed(1),
    functions: (totals.functions / count).toFixed(1),
    branches: (totals.branches / count).toFixed(1),
    overall: (
      (totals.lines + totals.statements + totals.functions + totals.branches) /
      (count * 4)
    ).toFixed(1),
  };
}

/**
 * Detect language from file extension
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
 * Detect appropriate test framework for language
 */
function detectTestFramework(language) {
  const frameworks = {
    JavaScript: "Jest",
    "React JSX": "Jest",
    TypeScript: "Jest",
    "React TSX": "Jest",
    Python: "pytest",
    Java: "JUnit",
    "C++": "Google Test",
    Go: "go test",
    Ruby: "RSpec",
    PHP: "PHPUnit",
    "C#": "NUnit",
  };
  return frameworks[language] || "Jest";
}

/**
 * Get list of all test files in sandbox
 */
function findAllTestFiles() {
  const testFiles = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(path.join(SANDBOX_PATH, dir));

    for (const file of files) {
      const filePath = path.join(dir, file);
      const fullPath = path.join(SANDBOX_PATH, filePath);
      const stat = fs.statSync(fullPath);

      if (
        stat.isDirectory() &&
        !file.startsWith(".") &&
        file !== "node_modules"
      ) {
        scanDirectory(filePath);
      } else if (stat.isFile() && isTestFile(file)) {
        testFiles.push(filePath);
      }
    }
  }

  scanDirectory("");
  return testFiles;
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

/**
 * Get test coverage report
 */
async function getCoverageReport(filePaths) {
  console.log(
    `[Test Runner] Generating coverage report for ${filePaths.length} files`
  );

  const results = await runMultiFileTests(filePaths, { coverage: true });

  return {
    success: true,
    coverage: results.coverage,
    filesCovered: filePaths.length,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  runMultiFileTests,
  runSingleFileTest,
  findAllTestFiles,
  findTestFile,
  getCoverageReport,
  detectTestFramework,
};
