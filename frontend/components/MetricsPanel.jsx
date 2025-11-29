"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * MetricsPanel Component
 *
 * Displays multi-file code quality metrics with:
 * - File selection interface
 * - Aggregated metrics dashboard
 * - Per-file breakdown with color-coded results
 * - AI-powered insights and recommendations
 * - Historical trends tracking
 * - Style compliance checking
 */
export default function MetricsPanel({
  isOpen,
  onClose,
  currentFilePath,
  projectPath,
  inline = false, // New prop to support inline mode (non-modal)
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [styleCompliance, setStyleCompliance] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, details, style, insights
  const [expandedFile, setExpandedFile] = useState(null);
  const [error, setError] = useState(null);

  // Auto-discover files when panel opens
  useEffect(() => {
    if (isOpen && projectPath) {
      discoverFiles();
    }
  }, [isOpen, projectPath]);

  // Auto-select current file if available
  useEffect(() => {
    if (currentFilePath && !selectedFiles.includes(currentFilePath)) {
      setSelectedFiles([currentFilePath]);
    }
  }, [currentFilePath]);

  const discoverFiles = async () => {
    try {
      // In a real implementation, this would call an API to discover source files
      // For now, we'll use a placeholder
      setAvailableFiles([
        { path: currentFilePath || "/example.js", language: "javascript" },
        // More files would be discovered here
      ]);
    } catch (err) {
      console.error("Error discovering files:", err);
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

  const calculateMetrics = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agents/batch/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: selectedFiles,
          projectPath,
          options: {
            includeHistory: true,
            generateInsights: true,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to calculate metrics");
      }

      setMetrics(data);
      setActiveTab("overview");
    } catch (err) {
      setError(err.message);
      console.error("Metrics error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkStyleCompliance = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agents/batch/style-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: selectedFiles,
          projectPath,
          options: {},
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to check style compliance");
      }

      setStyleCompliance(data);
      setActiveTab("style");
    } catch (err) {
      setError(err.message);
      console.error("Style check error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getMetricBgColor = (score) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "error":
        return "text-red-600 bg-red-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "info":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (!isOpen && !inline) return null;

  const content = (
    <motion.div
      initial={inline ? {} : { opacity: 0, scale: 0.95 }}
      animate={inline ? {} : { opacity: 1, scale: 1 }}
      exit={inline ? {} : { opacity: 0, scale: 0.95 }}
      className={`${
        inline ? "bg-slate-900" : "bg-white"
      } rounded-lg shadow-2xl w-full ${
        inline ? "" : "max-w-6xl max-h-[90vh]"
      } overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div
        className={`${
          inline
            ? "bg-gradient-to-r from-emerald-600 to-purple-600"
            : "bg-gradient-to-r from-purple-600 to-indigo-600"
        } text-white p-6`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Code Quality Metrics</h2>
            <p
              className={`${
                inline ? "text-emerald-100" : "text-purple-100"
              } text-sm mt-1`}
            >
              Multi-file quality analysis and tracking
            </p>
          </div>
          {!inline && (
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
          )}
        </div>
      </div>

      {/* File Selection */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Select Files</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                selectedFiles.includes(file.path)
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-indigo-400"
              }`}
            >
              {file.path.split("/").pop()}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={calculateMetrics}
            disabled={loading || selectedFiles.length === 0}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Analyzing..." : "Calculate Metrics"}
          </button>
          <button
            onClick={checkStyleCompliance}
            disabled={loading || selectedFiles.length === 0}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Checking..." : "Check Style Compliance"}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Tabs */}
      {metrics && (
        <div className="flex border-b bg-white">
          {["overview", "details", "style", "insights"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!metrics && !loading && (
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-lg font-medium">
              Select files and calculate metrics
            </p>
            <p className="text-sm mt-1">
              Choose one or more files to analyze code quality
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Analyzing code quality...</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Files Analyzed"
                value={metrics.totalFiles}
                icon="📁"
              />
              <MetricCard
                title="Avg Complexity"
                value={metrics?.aggregated?.avgComplexity?.toFixed(1)}
                score={100 - metrics?.aggregated?.avgComplexity * 10}
                icon="🧮"
              />
              <MetricCard
                title="Maintainability"
                value={metrics?.aggregated?.avgMaintainability?.toFixed(0)}
                score={metrics?.aggregated?.avgMaintainability}
                icon="🔧"
              />
              <MetricCard
                title="Total Lines"
                value={metrics?.aggregated?.totalLines?.toLocaleString()}
                icon="📄"
              />
            </div>

            {/* Quality Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quality Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Code Duplication
                    </span>
                    <span
                      className={`text-sm font-medium ${getMetricColor(
                        100 - metrics?.aggregated?.avgDuplication
                      )}`}
                    >
                      {metrics?.aggregated?.avgDuplication?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getMetricBgColor(
                        100 - metrics?.aggregated?.avgDuplication
                      )}`}
                      style={{
                        width: `${Math.min(
                          metrics?.aggregated?.avgDuplication,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Comment Density
                    </span>
                    <span
                      className={`text-sm font-medium ${getMetricColor(
                        metrics?.aggregated?.avgCommentDensity
                      )}`}
                    >
                      {metrics?.aggregated?.avgCommentDensity?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getMetricBgColor(
                        metrics?.aggregated?.avgCommentDensity
                      )}`}
                      style={{
                        width: `${Math.min(
                          metrics?.aggregated?.avgCommentDensity,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Trends */}
            {metrics.trends && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(metrics.trends).map(([key, trend]) => (
                    <TrendCard key={key} label={key} trend={trend} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && metrics && (
          <div className="space-y-4">
            {metrics.results.map((result, idx) => (
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
                      {result.metrics.maintainabilityIndex >= 80
                        ? "✅"
                        : result.metrics.maintainabilityIndex >= 60
                        ? "⚠️"
                        : "❌"}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">
                        {result.file.split("/").pop()}
                      </p>
                      <p className="text-sm text-gray-500">{result.language}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Maintainability</p>
                      <p
                        className={`text-lg font-bold ${getMetricColor(
                          result.metrics.maintainabilityIndex
                        )}`}
                      >
                        {result.metrics.maintainabilityIndex.toFixed(0)}
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
                      <div className="p-4 bg-gray-50 border-t space-y-3">
                        <MetricRow
                          label="Cyclomatic Complexity"
                          value={result.metrics.cyclomaticComplexity}
                        />
                        <MetricRow
                          label="Lines of Code"
                          value={result.metrics.linesOfCode}
                        />
                        <MetricRow
                          label="Comment Density"
                          value={`${result.metrics.commentDensity.toFixed(1)}%`}
                        />
                        <MetricRow
                          label="Code Duplication"
                          value={`${result.metrics.duplication.toFixed(1)}%`}
                        />
                        {result.metrics.halsteadMetrics && (
                          <>
                            <MetricRow
                              label="Halstead Volume"
                              value={result.metrics.halsteadMetrics.volume.toFixed(
                                0
                              )}
                            />
                            <MetricRow
                              label="Halstead Difficulty"
                              value={result.metrics.halsteadMetrics.difficulty.toFixed(
                                1
                              )}
                            />
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Style Tab */}
        {activeTab === "style" && (styleCompliance || metrics) && (
          <div className="space-y-6">
            {styleCompliance ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Violations"
                    value={styleCompliance.summary.totalViolations}
                    icon="⚠️"
                  />
                  <MetricCard
                    title="Errors"
                    value={styleCompliance.summary.errors}
                    icon="❌"
                  />
                  <MetricCard
                    title="Warnings"
                    value={styleCompliance.summary.warnings}
                    icon="⚠️"
                  />
                  <MetricCard
                    title="Info"
                    value={styleCompliance.summary.info}
                    icon="ℹ️"
                  />
                </div>

                {styleCompliance.results.map((result, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-800">
                        {result.file.split("/").pop()}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          result.violations.length === 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {result.violations.length} issues
                      </span>
                    </div>

                    {result.violations.length > 0 ? (
                      <div className="space-y-2">
                        {result.violations
                          .slice(0, 5)
                          .map((violation, vIdx) => (
                            <div
                              key={vIdx}
                              className="flex items-start gap-3 p-3 bg-gray-50 rounded"
                            >
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(
                                  violation.severity
                                )}`}
                              >
                                {violation.severity}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm text-gray-800">
                                  {violation.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Line {violation.line} • Rule: {violation.rule}
                                </p>
                              </div>
                            </div>
                          ))}
                        {result.violations.length > 5 && (
                          <p className="text-sm text-gray-500 text-center">
                            ... and {result.violations.length - 5} more issues
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-green-600">
                        ✓ No style violations found
                      </p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p>Click "Check Style Compliance" to see style analysis</p>
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === "insights" && metrics?.aiInsights && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🤖</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    AI-Powered Insights
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {metrics.aiInsights.summary}
                  </p>
                </div>
              </div>
            </div>

            {metrics.aiInsights.recommendations &&
              metrics.aiInsights.recommendations.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Recommendations
                  </h3>
                  <div className="space-y-3">
                    {metrics.aiInsights.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <span className="text-blue-600 font-bold">
                          {idx + 1}.
                        </span>
                        <p className="text-gray-800">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {metrics.aiInsights.priorities && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Priority Actions</h3>
                <div className="space-y-2">
                  {metrics.aiInsights.priorities.map((priority, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition"
                    >
                      <span className="text-2xl">
                        {priority.severity === "high"
                          ? "🔴"
                          : priority.severity === "medium"
                          ? "🟡"
                          : "🟢"}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {priority.action}
                        </p>
                        <p className="text-sm text-gray-600">
                          {priority.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  return inline ? (
    content
  ) : (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {content}
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, score, icon }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {score !== undefined && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              score >= 80
                ? "bg-green-100 text-green-700"
                : score >= 60
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {score.toFixed(0)}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function TrendCard({ label, trend }) {
  const isPositive = trend.direction === "improving";
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-600 mb-1">
        {label.replace(/([A-Z])/g, " $1").trim()}
      </p>
      <div className="flex items-center gap-2">
        <span
          className={`text-lg font-bold ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {isPositive ? "↗" : "↘"}
        </span>
        <span className="text-sm text-gray-700">{trend.change}</span>
      </div>
    </div>
  );
}
