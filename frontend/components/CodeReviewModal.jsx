"use client";

import { useState } from "react";

/**
 * CodeReviewModal Component
 * Displays AI-powered code review results with human-in-the-loop approval
 * Shows issues, suggestions, and allows selective refactoring
 */
export default function CodeReviewModal({
  isOpen,
  onClose,
  reviewData,
  onApplyRefactoring,
  isLoading = false,
}) {
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState("issues"); // issues | suggestions | positive

  if (!isOpen || !reviewData) return null;

  const { filePath, language, analysis } = reviewData;
  const { overall_quality, summary, issues, suggestions, positive_aspects } =
    analysis;

  // Toggle suggestion selection
  const toggleSuggestion = (suggestion) => {
    setSelectedSuggestions((prev) => {
      const exists = prev.find((s) => s.title === suggestion.title);
      if (exists) {
        return prev.filter((s) => s.title !== suggestion.title);
      }
      return [...prev, suggestion];
    });
  };

  // Check if a suggestion is selected
  const isSuggestionSelected = (suggestion) => {
    return selectedSuggestions.some((s) => s.title === suggestion.title);
  };

  // Handle apply refactoring
  const handleApplyRefactoring = () => {
    if (selectedSuggestions.length === 0) {
      alert("Please select at least one suggestion to apply");
      return;
    }
    onApplyRefactoring(selectedSuggestions);
  };

  // Get quality color
  const getQualityColor = (quality) => {
    const colors = {
      excellent: "text-emerald-400",
      good: "text-green-400",
      fair: "text-yellow-400",
      poor: "text-red-400",
      unknown: "text-slate-400",
    };
    return colors[quality] || colors.unknown;
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-red-500/20 text-red-300 border-red-500",
      high: "bg-orange-500/20 text-orange-300 border-orange-500",
      medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500",
      low: "bg-blue-500/20 text-blue-300 border-blue-500",
    };
    return colors[severity] || colors.low;
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-purple-500/20 text-purple-300 border-purple-500",
      medium: "bg-indigo-500/20 text-indigo-300 border-indigo-500",
      low: "bg-slate-500/20 text-slate-300 border-slate-500",
    };
    return colors[priority] || colors.low;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">
                🔍 AI Code Review Results
              </h2>
              <p className="text-sm text-slate-400">
                File:{" "}
                <span className="text-emerald-300 font-mono">{filePath}</span>
              </p>
              <p className="text-sm text-slate-400">
                Language: <span className="text-blue-300">{language}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              title="Close"
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

          {/* Quality Summary */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-slate-400">Overall Quality:</span>
              <span
                className={`text-lg font-bold uppercase ${getQualityColor(
                  overall_quality
                )}`}
              >
                {overall_quality}
              </span>
            </div>
            <p className="text-sm text-slate-300">{summary}</p>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="text-red-400">
                🐛 {issues.length} Issue{issues.length !== 1 ? "s" : ""}
              </span>
              <span className="text-purple-400">
                💡 {suggestions.length} Suggestion
                {suggestions.length !== 1 ? "s" : ""}
              </span>
              <span className="text-green-400">
                ✨ {positive_aspects.length} Positive Aspect
                {positive_aspects.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("issues")}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === "issues"
                ? "bg-slate-800 text-red-400 border-t-2 border-red-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Issues ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === "suggestions"
                ? "bg-slate-800 text-purple-400 border-t-2 border-purple-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Suggestions ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveTab("positive")}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === "positive"
                ? "bg-slate-800 text-green-400 border-t-2 border-green-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Positive ({positive_aspects.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Issues Tab */}
          {activeTab === "issues" && (
            <>
              {issues.length === 0 && (
                <p className="text-slate-500 text-center py-8 italic">
                  🎉 No issues found! The code looks clean.
                </p>
              )}
              {issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getSeverityColor(
                    issue.severity
                  )} bg-opacity-10`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${getSeverityColor(
                          issue.severity
                        )}`}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-xs text-slate-400 uppercase">
                        {issue.type}
                      </span>
                      {issue.line && (
                        <span className="text-xs text-slate-500 font-mono">
                          Line {issue.line}
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="font-semibold text-slate-200 mb-2">
                    {issue.title}
                  </h4>
                  <p className="text-sm text-slate-300 mb-2">
                    {issue.description}
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    Impact: {issue.impact}
                  </p>
                </div>
              ))}
            </>
          )}

          {/* Suggestions Tab */}
          {activeTab === "suggestions" && (
            <>
              {suggestions.length === 0 && (
                <p className="text-slate-500 text-center py-8 italic">
                  No improvement suggestions at this time.
                </p>
              )}
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getPriorityColor(
                    suggestion.priority
                  )} bg-opacity-10 cursor-pointer transition-all hover:bg-opacity-20 ${
                    isSuggestionSelected(suggestion)
                      ? "ring-2 ring-purple-500"
                      : ""
                  }`}
                  onClick={() => toggleSuggestion(suggestion)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSuggestionSelected(suggestion)}
                        onChange={() => toggleSuggestion(suggestion)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${getPriorityColor(
                          suggestion.priority
                        )}`}
                      >
                        {suggestion.priority}
                      </span>
                      <span className="text-xs text-slate-400 uppercase">
                        {suggestion.type}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-slate-200 mb-2 ml-6">
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-slate-300 mb-2 ml-6">
                    {suggestion.description}
                  </p>
                  <p className="text-xs text-green-400 italic ml-6">
                    ✓ Benefit: {suggestion.benefit}
                  </p>
                </div>
              ))}
            </>
          )}

          {/* Positive Aspects Tab */}
          {activeTab === "positive" && (
            <>
              {positive_aspects.length === 0 && (
                <p className="text-slate-500 text-center py-8 italic">
                  No positive aspects highlighted.
                </p>
              )}
              {positive_aspects.map((aspect, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-green-500/30 bg-green-500/10"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-xl">✓</span>
                    <p className="text-sm text-slate-300">{aspect}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {selectedSuggestions.length > 0 && (
                <span className="text-purple-400 font-medium">
                  {selectedSuggestions.length} suggestion
                  {selectedSuggestions.length !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors font-medium"
                disabled={isLoading}
              >
                Close
              </button>
              <button
                onClick={handleApplyRefactoring}
                disabled={selectedSuggestions.length === 0 || isLoading}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Applying...
                  </>
                ) : (
                  <>✨ Apply Selected Refactoring</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
