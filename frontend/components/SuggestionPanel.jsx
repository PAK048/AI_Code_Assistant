"use client";

import { useState, useEffect } from "react";

/**
 * SuggestionPanel Component
 * Displays context-aware predictive suggestions, test cases, dependencies, and metrics
 * Works in both web app and can be adapted for IDE plugin sidebar
 */
export default function SuggestionPanel({
  filePath,
  code,
  backendUrl,
  onApplySuggestion,
  isCompact = false, // For IDE plugin mode
}) {
  const [activeTab, setActiveTab] = useState("predictions");
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [tests, setTests] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [dependencies, setDependencies] = useState(null);
  const [error, setError] = useState(null);

  // Auto-load predictions when code changes
  useEffect(() => {
    if (code && filePath) {
      loadPredictions();
    }
  }, [code, filePath]);

  const loadPredictions = async () => {
    if (!code) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/agents/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, code }),
      });

      const data = await response.json();

      if (data.success) {
        setPredictions(data.predictions);
      } else {
        throw new Error(data.error || "Failed to load predictions");
      }
    } catch (err) {
      setError(err.message);
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    if (!code) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/agents/generate-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, code }),
      });

      const data = await response.json();

      if (data.success) {
        setTests(data);
      } else {
        throw new Error(data.error || "Failed to generate tests");
      }
    } catch (err) {
      setError(err.message);
      console.error("Test generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (!code) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/agents/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, code }),
      });

      const data = await response.json();

      if (data.success) {
        setMetrics(data.metrics);
      } else {
        throw new Error(data.error || "Failed to calculate metrics");
      }
    } catch (err) {
      setError(err.message);
      console.error("Metrics error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    if (!code) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/agents/analyze-deps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, code }),
      });

      const data = await response.json();

      if (data.success) {
        setDependencies(data.analysis);
      } else {
        throw new Error(data.error || "Failed to analyze dependencies");
      }
    } catch (err) {
      setError(err.message);
      console.error("Dependency analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // Lazy load data for each tab
    if (tab === "tests" && !tests) {
      loadTests();
    } else if (tab === "metrics" && !metrics) {
      loadMetrics();
    } else if (tab === "dependencies" && !dependencies) {
      loadDependencies();
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "text-red-400 bg-red-500/10 border-red-500",
      medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500",
      low: "text-blue-400 bg-blue-500/10 border-blue-500",
    };
    return colors[priority] || colors.low;
  };

  const getImportanceColor = (importance) => {
    const colors = {
      critical: "text-red-400",
      important: "text-orange-400",
      nice_to_have: "text-blue-400",
    };
    return colors[importance] || colors.nice_to_have;
  };

  if (!code) {
    return (
      <div
        className={`bg-slate-800/60 backdrop-blur rounded-lg p-4 border border-slate-700/50 ${
          isCompact ? "text-sm" : ""
        }`}
      >
        <p className="text-slate-500 text-center italic">
          💡 Generate or load code to see AI suggestions
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-800/60 backdrop-blur rounded-lg border border-slate-700/50 flex flex-col ${
        isCompact ? "h-full" : ""
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-emerald-400 mb-2">
          🔮 AI Suggestions
        </h3>
        <p className="text-xs text-slate-400">
          Context-aware predictions for {filePath || "your code"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-slate-700 overflow-x-auto">
        <button
          onClick={() => handleTabChange("predictions")}
          className={`px-3 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === "predictions"
              ? "bg-slate-700 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          ⚡ Next Steps
        </button>
        <button
          onClick={() => handleTabChange("tests")}
          className={`px-3 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === "tests"
              ? "bg-slate-700 text-blue-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          🧪 Tests
        </button>
        <button
          onClick={() => handleTabChange("dependencies")}
          className={`px-3 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === "dependencies"
              ? "bg-slate-700 text-purple-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          📦 Dependencies
        </button>
        <button
          onClick={() => handleTabChange("metrics")}
          className={`px-3 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === "metrics"
              ? "bg-slate-700 text-yellow-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          📊 Metrics
        </button>
      </div>

      {/* Content */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-3 ${
          isCompact ? "max-h-96" : "min-h-[400px]"
        }`}
      >
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Analyzing code...</p>
          </div>
        )}

        {/* Predictions Tab */}
        {activeTab === "predictions" && predictions && !loading && (
          <div className="space-y-4">
            {/* Next Steps */}
            {predictions.next_steps && predictions.next_steps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">
                  Suggested Next Steps
                </h4>
                {predictions.next_steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border mb-2 ${getPriorityColor(
                      step.priority
                    )} hover:bg-opacity-20 cursor-pointer transition-all`}
                    onClick={() =>
                      onApplySuggestion &&
                      onApplySuggestion({ type: "next_step", data: step })
                    }
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase border">
                        {step.priority}
                      </span>
                      <span className="text-xs text-slate-500 uppercase">
                        {step.category}
                      </span>
                    </div>
                    <h5 className="font-medium text-slate-200 text-sm mb-1">
                      {step.title}
                    </h5>
                    <p className="text-xs text-slate-400">{step.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Improvements */}
            {predictions.improvements &&
              predictions.improvements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">
                    Improvement Opportunities
                  </h4>
                  {predictions.improvements.map((imp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 mb-2"
                    >
                      <h5 className="font-medium text-indigo-300 text-sm mb-1">
                        {imp.area}
                      </h5>
                      <p className="text-xs text-slate-400 mb-1">
                        {imp.suggestion}
                      </p>
                      <p className="text-xs text-green-400">✓ {imp.impact}</p>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === "tests" && !loading && (
          <div className="space-y-4">
            {predictions?.test_cases && predictions.test_cases.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">
                  Recommended Test Cases
                </h4>
                {predictions.test_cases.map((test, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 mb-2"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className={`text-xs font-semibold ${getImportanceColor(
                          test.importance
                        )}`}
                      >
                        {test.importance?.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500 uppercase">
                        {test.type}
                      </span>
                    </div>
                    <h5 className="font-medium text-slate-200 text-sm mb-1">
                      {test.scenario}
                    </h5>
                    <p className="text-xs text-slate-400">{test.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {tests?.testCode && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-300">
                    Generated Test Code ({tests.framework})
                  </h4>
                  <button
                    onClick={() =>
                      onApplySuggestion &&
                      onApplySuggestion({ type: "test_code", data: tests })
                    }
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Apply Tests
                  </button>
                </div>
                <pre className="bg-slate-950 p-3 rounded-lg text-xs overflow-auto max-h-64 border border-slate-800 font-mono">
                  {tests.testCode}
                </pre>
              </div>
            )}

            {!tests && !predictions?.test_cases && (
              <p className="text-slate-500 text-sm text-center py-8 italic">
                No test suggestions available
              </p>
            )}
          </div>
        )}

        {/* Dependencies Tab */}
        {activeTab === "dependencies" && !loading && (
          <div className="space-y-4">
            {predictions?.dependencies &&
              predictions.dependencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">
                    Dependency Suggestions
                  </h4>
                  {predictions.dependencies.map((dep, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 mb-2"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h5 className="font-medium text-purple-300 text-sm font-mono">
                          {dep.name}
                        </h5>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            dep.type === "existing"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {dep.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">
                        {dep.purpose}
                      </p>
                      {dep.install_command && (
                        <code className="text-xs text-emerald-400 block mt-2">
                          {dep.install_command}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {dependencies && (
              <>
                {dependencies.suggested_dependencies?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">
                      Suggested Packages
                    </h4>
                    {dependencies.suggested_dependencies.map((dep, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 mb-2"
                      >
                        <h5 className="font-medium text-purple-300 text-sm">
                          {dep.name}
                        </h5>
                        <p className="text-xs text-slate-400">{dep.purpose}</p>
                        <p className="text-xs text-green-400 mt-1">
                          ✓ {dep.benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {dependencies.optimization_opportunities?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">
                      Optimization Opportunities
                    </h4>
                    {dependencies.optimization_opportunities.map((opt, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 mb-2"
                      >
                        <p className="text-xs text-slate-400 mb-1">
                          <span className="text-slate-500">Current:</span>{" "}
                          {opt.current}
                        </p>
                        <p className="text-xs text-yellow-300 mb-1">
                          <span className="font-semibold">Suggestion:</span>{" "}
                          {opt.suggestion}
                        </p>
                        <p className="text-xs text-green-400">
                          💡 {opt.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {!dependencies && !predictions?.dependencies && (
              <p className="text-slate-500 text-sm text-center py-8 italic">
                No dependency analysis available
              </p>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && !loading && metrics && (
          <div className="space-y-4">
            {/* Overall Assessment */}
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-yellow-400">
                  Overall Quality Score
                </h4>
                <span className="text-2xl font-bold text-yellow-400">
                  {metrics.overall_assessment.overall_score}/100
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                {metrics.overall_assessment.rating} -{" "}
                {metrics.overall_assessment.recommendation}
              </p>

              {metrics.overall_assessment.strengths.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-green-400 font-semibold mb-1">
                    Strengths:
                  </p>
                  {metrics.overall_assessment.strengths.map((s, idx) => (
                    <p key={idx} className="text-xs text-slate-300">
                      ✓ {s}
                    </p>
                  ))}
                </div>
              )}

              {metrics.overall_assessment.issues.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-400 font-semibold mb-1">
                    Issues:
                  </p>
                  {metrics.overall_assessment.issues.map((i, idx) => (
                    <p key={idx} className="text-xs text-slate-300">
                      ⚠ {i}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <p className="text-xs text-slate-400">Complexity</p>
                <p className="text-lg font-bold text-slate-200">
                  {metrics.cyclomatic_complexity.total}
                </p>
                <p className="text-xs text-slate-500">
                  {metrics.cyclomatic_complexity.rating}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <p className="text-xs text-slate-400">Maintainability</p>
                <p className="text-lg font-bold text-slate-200">
                  {metrics.maintainability_index.score.toFixed(0)}/100
                </p>
                <p className="text-xs text-slate-500">
                  {metrics.maintainability_index.rating}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <p className="text-xs text-slate-400">LOC</p>
                <p className="text-lg font-bold text-slate-200">
                  {metrics.lines_of_code.code}
                </p>
                <p className="text-xs text-slate-500">
                  {metrics.lines_of_code.total} total
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <p className="text-xs text-slate-400">Duplication</p>
                <p className="text-lg font-bold text-slate-200">
                  {metrics.code_duplication.percentage}%
                </p>
                <p className="text-xs text-slate-500">
                  {metrics.code_duplication.rating}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <p className="text-xs text-slate-400">Comments</p>
                <p className="text-lg font-bold text-slate-200">
                  {metrics.comment_density.percentage}%
                </p>
                <p className="text-xs text-slate-500">
                  {metrics.comment_density.rating}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                <p className="text-xs text-slate-400">Readability</p>
                <p className="text-lg font-bold text-slate-200">
                  {metrics.readability_score.score}/100
                </p>
                <p className="text-xs text-slate-500">
                  {metrics.readability_score.rating}
                </p>
              </div>
            </div>

            {/* Function Metrics */}
            {metrics.function_metrics.total_functions > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">
                  Function Analysis
                </h4>
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                  <p className="text-xs text-slate-400">
                    Total Functions: {metrics.function_metrics.total_functions}
                  </p>
                  <p className="text-xs text-slate-400">
                    Average Length: {metrics.function_metrics.average_length}{" "}
                    LOC
                  </p>
                  {metrics.function_metrics.long_functions > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠ {metrics.function_metrics.long_functions} functions
                      exceed 50 lines
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
