"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FileActionsPanel({
  file,
  backendUrl,
  onGetMetrics,
  onReview,
  onRefactor,
}) {
  const [activeTab, setActiveTab] = useState("actions");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleGetMetrics = async () => {
    if (!file || loading) return;
    setLoading(true);
    setResults(null);
    try {
      const response = await fetch(`${backendUrl}/api/agents/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: file.path, code: file.content }),
      });
      const data = await response.json();
      if (data.success) {
        setResults({ type: "metrics", data: data.metrics });
        setActiveTab("metrics");
        onGetMetrics?.(data);
      }
    } catch (error) {
      console.error("Get metrics error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!file || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/agents/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: file.path, code: file.content }),
      });
      const data = await response.json();
      if (data.success) {
        setResults({ type: "review", data: data.analysis });
        setActiveTab("review");
        onReview?.(data);
      }
    } catch (error) {
      console.error("Review error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefactor = async () => {
    if (!file || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/agents/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: file.path, code: file.content }),
      });
      const data = await response.json();
      if (data.success && data.analysis) {
        setResults({ type: "review", data: data.analysis });
        setActiveTab("review");
        onRefactor?.(data);
      }
    } catch (error) {
      console.error("Refactor error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900/40 backdrop-blur border-l border-slate-700/50">
        <div className="text-center text-slate-500">
          <p className="font-medium">No file selected</p>
          <p className="text-sm mt-1">Select a file to see actions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/40 backdrop-blur border-l border-slate-700/50">
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/50">
        <h3 className="text-white font-semibold">File Actions</h3>
        <p className="text-xs text-slate-500 mt-1">Actions for: {file.name}</p>
      </div>

      <div className="flex border-b border-slate-700/50 bg-slate-800/40">
        {["actions", "metrics", "review"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === "actions" && (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <button
                onClick={handleGetMetrics}
                disabled={loading}
                className="w-full p-4 bg-purple-600/10 border-2 border-purple-600/30 hover:bg-purple-600/20 text-purple-400 rounded-lg disabled:opacity-50"
              >
                <div className="text-left">
                  <div className="font-semibold">Quality Metrics</div>
                  <div className="text-xs mt-1 text-slate-400">
                    Analyze code quality metrics
                  </div>
                </div>
              </button>
              <button
                onClick={handleReview}
                disabled={loading}
                className="w-full p-4 bg-blue-600/10 border-2 border-blue-600/30 hover:bg-blue-600/20 text-blue-400 rounded-lg disabled:opacity-50"
              >
                <div className="text-left">
                  <div className="font-semibold">Code Review</div>
                  <div className="text-xs mt-1 text-slate-400">
                    Get AI-powered code review
                  </div>
                </div>
              </button>
              <button
                onClick={handleRefactor}
                disabled={loading}
                className="w-full p-4 bg-amber-600/10 border-2 border-amber-600/30 hover:bg-amber-600/20 text-amber-400 rounded-lg disabled:opacity-50"
              >
                <div className="text-left">
                  <div className="font-semibold">AI Refactoring</div>
                  <div className="text-xs mt-1 text-slate-400">
                    Get refactoring suggestions
                  </div>
                </div>
              </button>
              {loading && (
                <div className="mt-6 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-400 mt-3">Processing...</p>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === "metrics" && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {results?.type === "metrics" ? (
                <MetricsDisplay metrics={results.data} />
              ) : (
                <EmptyState
                  message="No metrics yet"
                  description="Click 'Quality Metrics' to analyze this file"
                />
              )}
            </motion.div>
          )}
          {activeTab === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {results?.type === "review" ? (
                <ReviewDisplay review={results.data} />
              ) : (
                <EmptyState
                  message="No review available"
                  description="Click 'Code Review' to get AI analysis"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper Components
function EmptyState({ message, description }) {
  return (
    <div className="text-center py-12 text-slate-500">
      <p className="font-medium">{message}</p>
      <p className="text-sm mt-1">{description}</p>
    </div>
  );
}

function MetricsDisplay({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <MetricCard
        label="Cyclomatic Complexity"
        value={
          metrics.cyclomatic_complexity?.total ||
          metrics.cyclomaticComplexity ||
          "N/A"
        }
      />
      <MetricCard
        label="Maintainability Index"
        value={
          metrics.maintainability_index?.score?.toFixed(1) ||
          metrics.maintainabilityIndex?.toFixed(1) ||
          "N/A"
        }
      />
      <MetricCard
        label="Lines of Code"
        value={metrics.lines_of_code?.total || metrics.linesOfCode || "N/A"}
      />
      <MetricCard
        label="Comment Density"
        value={`${
          metrics.comment_density?.percentage?.toFixed(1) ||
          metrics.commentDensity?.toFixed(1) ||
          0
        }%`}
      />
      <MetricCard
        label="Code Duplication"
        value={`${
          metrics.code_duplication?.percentage?.toFixed(1) ||
          metrics.duplication?.toFixed(1) ||
          0
        }%`}
      />
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-lg font-bold text-white">{value}</span>
      </div>
    </div>
  );
}

function ReviewDisplay({ review }) {
  if (!review) return null;

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      {review.summary && (
        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
          <p className="text-sm font-medium text-emerald-400 mb-1">Summary</p>
          <p className="text-sm text-slate-300">{review.summary}</p>
          {review.overall_quality && (
            <span
              className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                review.overall_quality === "excellent"
                  ? "bg-green-900/30 text-green-400"
                  : review.overall_quality === "good"
                  ? "bg-blue-900/30 text-blue-400"
                  : review.overall_quality === "fair"
                  ? "bg-yellow-900/30 text-yellow-400"
                  : "bg-red-900/30 text-red-400"
              }`}
            >
              Quality: {review.overall_quality}
            </span>
          )}
        </div>
      )}

      {/* Issues */}
      {review.issues && review.issues.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-400 mb-2">
            Issues Found ({review.issues.length})
          </h4>
          <div className="space-y-2">
            {review.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  issue.severity === "critical" || issue.severity === "high"
                    ? "bg-red-900/20 border-red-700/50"
                    : issue.severity === "medium"
                    ? "bg-yellow-900/20 border-yellow-700/50"
                    : "bg-blue-900/20 border-blue-700/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">
                    {issue.severity === "critical" || issue.severity === "high"
                      ? "🔴"
                      : issue.severity === "medium"
                      ? "⚠️"
                      : "ℹ️"}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">
                        {issue.title || issue.message}
                      </p>
                      {issue.type && (
                        <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                          {issue.type}
                        </span>
                      )}
                    </div>
                    {issue.description && (
                      <p className="text-sm text-slate-300 mt-1">
                        {issue.description}
                      </p>
                    )}
                    {issue.line && (
                      <p className="text-xs text-slate-500 mt-1">
                        Line {issue.line}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {review.suggestions && review.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">
            Suggestions ({review.suggestions.length})
          </h4>
          <div className="space-y-2">
            {review.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="p-3 bg-emerald-900/10 rounded-lg border border-emerald-700/30"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {suggestion.suggestion ||
                        suggestion.title ||
                        suggestion.message ||
                        JSON.stringify(suggestion)}
                    </p>
                    {suggestion.description && (
                      <p className="text-sm text-slate-300 mt-1">
                        {suggestion.description}
                      </p>
                    )}
                    {suggestion.benefit && (
                      <p className="text-xs text-emerald-400 mt-1">
                        ✓ {suggestion.benefit}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positive Aspects */}
      {review.positive_aspects && review.positive_aspects.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-blue-400 mb-2">
            Positive Aspects
          </h4>
          <div className="p-3 bg-blue-900/10 rounded-lg border border-blue-700/30">
            <ul className="space-y-1">
              {review.positive_aspects.map((aspect, idx) => (
                <li
                  key={idx}
                  className="text-sm text-slate-300 flex items-start gap-2"
                >
                  <span className="text-blue-400 mt-0.5">✓</span>
                  <span>{aspect}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* No data message */}
      {(!review.issues || review.issues.length === 0) &&
        (!review.suggestions || review.suggestions.length === 0) &&
        !review.summary && (
          <div className="text-center py-8 text-slate-500">
            <p>No issues or suggestions found</p>
          </div>
        )}
    </div>
  );
}
