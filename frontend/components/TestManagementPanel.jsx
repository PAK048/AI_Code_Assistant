"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TestManagementPanel Component
 *
 * Multi-file test execution with:
 * - File selection interface for test files
 * - Test execution controls (run all, run selected, watch mode)
 * - Real-time test results display
 * - Coverage visualization
 * - Per-file test breakdown
 * - Failed test details with stack traces
 */
export default function TestManagementPanel({
  isOpen,
  onClose,
  currentFilePath,
  projectPath,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [activeTab, setActiveTab] = useState("summary"); // summary, details, coverage, failed
  const [expandedFile, setExpandedFile] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);
  const [error, setError] = useState(null);
  const [watchMode, setWatchMode] = useState(false);

  // Auto-discover test files when panel opens
  useEffect(() => {
    if (isOpen && projectPath) {
      discoverTestFiles();
    }
  }, [isOpen, projectPath]);

  // Auto-select current file if it's a test file
  useEffect(() => {
    if (
      currentFilePath &&
      isTestFile(currentFilePath) &&
      !selectedFiles.includes(currentFilePath)
    ) {
      setSelectedFiles([currentFilePath]);
    }
  }, [currentFilePath]);

  const isTestFile = (filePath) => {
    const testPatterns = [".test.", ".spec.", "_test.", "test_", "Test"];
    return testPatterns.some((pattern) => filePath.includes(pattern));
  };

  const discoverTestFiles = async () => {
    try {
      // In a real implementation, this would call an API to discover test files
      // For now, we'll use a placeholder
      setAvailableFiles([
        {
          path: currentFilePath || "/example.test.js",
          language: "javascript",
          framework: "jest",
        },
        // More test files would be discovered here
      ]);
    } catch (err) {
      console.error("Error discovering test files:", err);
    }
  };

  const handleFileToggle = (filePath) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath)
        ? prev.filter((f) => f !== filePath)
        : [...prev, filePath]
    );
  };

  const handleSelectAll = () => {
    setSelectedFiles(availableFiles.map((f) => f.path));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
  };

  const runTests = async (options = {}) => {
    if (selectedFiles.length === 0 && !options.runAll) {
      setError("Please select at least one test file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agents/batch/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: options.runAll ? null : selectedFiles,
          options: {
            coverage: options.coverage !== false,
            verbose: true,
            watch: watchMode,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to run tests");
      }

      setTestResults(data);
      setActiveTab("summary");
    } catch (err) {
      setError(err.message);
      console.error("Test execution error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "passed":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "skipped":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "passed":
        return "✓";
      case "failed":
        return "✗";
      case "skipped":
        return "⊘";
      default:
        return "?";
    }
  };

  const getCoverageColor = (percentage) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Test Management</h2>
              <p className="text-green-100 text-sm mt-1">
                Multi-file test execution with coverage tracking
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* File Selection */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Select Test Files</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={watchMode}
                  onChange={(e) => setWatchMode(e.target.checked)}
                  className="rounded"
                />
                Watch Mode
              </label>
              <span className="text-gray-400">|</span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {availableFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => handleFileToggle(file.path)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  selectedFiles.includes(file.path)
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-teal-400"
                }`}
              >
                <span>{file.path.split("/").pop()}</span>
                <span className="text-xs opacity-75">{file.framework}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => runTests({ coverage: true })}
              disabled={loading || selectedFiles.length === 0}
              className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Running Tests..." : "Run Selected Tests"}
            </button>
            <button
              onClick={() => runTests({ runAll: true, coverage: true })}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Running..." : "Run All Tests"}
            </button>
            <button
              onClick={() => runTests({ coverage: false })}
              disabled={loading || selectedFiles.length === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Quick Run
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Tabs */}
        {testResults && (
          <div className="flex border-b bg-white">
            {["summary", "details", "coverage", "failed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 font-medium transition ${
                  activeTab === tab
                    ? "border-b-2 border-teal-600 text-teal-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "failed" && testResults.summary.failed > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                    {testResults.summary.failed}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!testResults && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-16 h-16 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <p className="text-lg font-medium">
                Select test files and run tests
              </p>
              <p className="text-sm mt-1">
                Choose one or more test files to execute
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
              <p className="text-gray-600">Running tests...</p>
              <p className="text-sm text-gray-500 mt-2">
                This may take a few moments
              </p>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === "summary" && testResults && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard
                  title="Total Tests"
                  value={testResults.summary.totalTests}
                  icon="📋"
                  color="bg-blue-100 text-blue-700"
                />
                <SummaryCard
                  title="Passed"
                  value={testResults.summary.passed}
                  icon="✓"
                  color="bg-green-100 text-green-700"
                />
                <SummaryCard
                  title="Failed"
                  value={testResults.summary.failed}
                  icon="✗"
                  color="bg-red-100 text-red-700"
                />
                <SummaryCard
                  title="Skipped"
                  value={testResults.summary.skipped}
                  icon="⊘"
                  color="bg-yellow-100 text-yellow-700"
                />
                <SummaryCard
                  title="Duration"
                  value={`${(testResults.summary.duration / 1000).toFixed(2)}s`}
                  icon="⏱️"
                  color="bg-purple-100 text-purple-700"
                />
              </div>

              {/* Pass Rate */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Pass Rate</h3>
                  <span
                    className={`text-2xl font-bold ${
                      testResults.summary.passRate >= 80
                        ? "text-green-600"
                        : testResults.summary.passRate >= 60
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {testResults.summary.passRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all ${
                      testResults.summary.passRate >= 80
                        ? "bg-green-500"
                        : testResults.summary.passRate >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${testResults.summary.passRate}%` }}
                  />
                </div>
              </div>

              {/* File Results Overview */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">File Results</h3>
                <div className="space-y-2">
                  {testResults.results.map((result, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {result.failed === 0
                            ? "✅"
                            : result.passed > 0
                            ? "⚠️"
                            : "❌"}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800">
                            {result.file.split("/").pop()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {result.framework}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-green-600 font-medium">
                          {result.passed} passed
                        </span>
                        {result.failed > 0 && (
                          <span className="text-sm text-red-600 font-medium">
                            {result.failed} failed
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {result.duration}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === "details" && testResults && (
            <div className="space-y-4">
              {testResults.results.map((result, idx) => (
                <div
                  key={idx}
                  className="bg-white border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedFile(expandedFile === idx ? null : idx)
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {result.failed === 0
                          ? "✅"
                          : result.passed > 0
                          ? "⚠️"
                          : "❌"}
                      </span>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">
                          {result.file.split("/").pop()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {result.tests.length} tests • {result.framework}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p
                          className={`text-lg font-bold ${getCoverageColor(
                            (result.passed / result.tests.length) * 100
                          )}`}
                        >
                          {(
                            (result.passed / result.tests.length) *
                            100
                          ).toFixed(0)}
                          %
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedFile === idx ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedFile === idx && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-gray-50 border-t space-y-2">
                          {result.tests.map((test, tIdx) => (
                            <div
                              key={tIdx}
                              className="flex items-start gap-3 p-3 bg-white rounded-lg"
                            >
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                  test.status
                                )}`}
                              >
                                {getStatusIcon(test.status)}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  {test.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {test.duration}ms
                                </p>
                                {test.error && (
                                  <button
                                    onClick={() =>
                                      setExpandedTest(
                                        expandedTest === `${idx}-${tIdx}`
                                          ? null
                                          : `${idx}-${tIdx}`
                                      )
                                    }
                                    className="text-xs text-red-600 hover:underline mt-2"
                                  >
                                    {expandedTest === `${idx}-${tIdx}`
                                      ? "Hide"
                                      : "Show"}{" "}
                                    Error
                                  </button>
                                )}
                                {expandedTest === `${idx}-${tIdx}` &&
                                  test.error && (
                                    <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 overflow-x-auto">
                                      {test.error}
                                    </pre>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* Coverage Tab */}
          {activeTab === "coverage" && testResults?.coverage && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CoverageCard
                  title="Lines"
                  percentage={testResults.coverage.overall.lines}
                  covered={testResults.coverage.overall.linesCovered}
                  total={testResults.coverage.overall.totalLines}
                />
                <CoverageCard
                  title="Functions"
                  percentage={testResults.coverage.overall.functions}
                  covered={testResults.coverage.overall.functionsCovered}
                  total={testResults.coverage.overall.totalFunctions}
                />
                <CoverageCard
                  title="Branches"
                  percentage={testResults.coverage.overall.branches}
                  covered={testResults.coverage.overall.branchesCovered}
                  total={testResults.coverage.overall.totalBranches}
                />
                <CoverageCard
                  title="Statements"
                  percentage={testResults.coverage.overall.statements}
                  covered={testResults.coverage.overall.statementsCovered}
                  total={testResults.coverage.overall.totalStatements}
                />
              </div>

              {/* Per-File Coverage */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Coverage by File</h3>
                <div className="space-y-3">
                  {testResults.coverage.files.map((file, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          {file.path.split("/").pop()}
                        </span>
                        <span
                          className={`text-sm font-bold ${getCoverageColor(
                            file.coverage.lines
                          )}`}
                        >
                          {file.coverage.lines.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            file.coverage.lines >= 80
                              ? "bg-green-500"
                              : file.coverage.lines >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${file.coverage.lines}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uncovered Lines */}
              {testResults.coverage.files.some(
                (f) => f.uncoveredLines?.length > 0
              ) && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Uncovered Lines
                  </h3>
                  <div className="space-y-3">
                    {testResults.coverage.files
                      .filter((f) => f.uncoveredLines?.length > 0)
                      .map((file, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-red-50 border border-red-200 rounded-lg"
                        >
                          <p className="font-medium text-gray-800 mb-2">
                            {file.path.split("/").pop()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Lines: {file.uncoveredLines.join(", ")}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Failed Tab */}
          {activeTab === "failed" && testResults && (
            <div className="space-y-4">
              {testResults.results
                .filter((result) => result.failed > 0)
                .map((result, rIdx) => (
                  <div key={rIdx} className="space-y-3">
                    {result.tests
                      .filter((test) => test.status === "failed")
                      .map((test, tIdx) => (
                        <div
                          key={tIdx}
                          className="bg-white border border-red-200 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-2xl">❌</span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">
                                {test.name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {result.file.split("/").pop()} • {test.duration}
                                ms
                              </p>
                            </div>
                          </div>
                          {test.error && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Error Details:
                              </p>
                              <pre className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 overflow-x-auto whitespace-pre-wrap">
                                {test.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ))}

              {testResults.summary.failed === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-green-600">
                  <svg
                    className="w-16 h-16 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium">All tests passed! 🎉</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Helper Components
function SummaryCard({ title, value, icon, color }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div
        className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${color}`}
      >
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}

function CoverageCard({ title, percentage, covered, total }) {
  const color =
    percentage >= 80
      ? "text-green-600"
      : percentage >= 60
      ? "text-yellow-600"
      : "text-red-600";
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{percentage.toFixed(1)}%</p>
      <p className="text-xs text-gray-500 mt-2">
        {covered} / {total}
      </p>
    </div>
  );
}
