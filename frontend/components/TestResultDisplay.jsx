"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TestResultDisplay Component
 *
 * Displays test execution results with:
 * - Summary cards (passed, failed, total)
 * - Collapsible sections for raw output and errors
 * - Visual indicators for test status
 */
export default function TestResultDisplay({ testResults }) {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!testResults) {
    return null;
  }

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Handle error state
  if (!testResults.success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-900/20 border border-red-500/30 rounded-lg p-6"
      >
        <div className="flex items-start space-x-3">
          <span className="text-2xl">❌</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              Test Execution Failed
            </h3>
            <p className="text-slate-300 mb-3">
              {testResults.message || "An error occurred during test execution"}
            </p>
            {testResults.error && (
              <div className="bg-slate-900/50 rounded p-3 font-mono text-sm text-red-300">
                {testResults.error}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  const summary = testResults.summary || {};
  const passed = summary.passed || 0;
  const failed = summary.failed || 0;
  const total = summary.total || passed + failed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Passed Tests Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-green-900/30 to-green-800/10 border border-green-500/30 rounded-lg p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Passed</p>
              <p className="text-3xl font-bold text-green-400 mt-1">{passed}</p>
            </div>
            <span className="text-4xl">✅</span>
          </div>
        </motion.div>

        {/* Failed Tests Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-red-900/30 to-red-800/10 border border-red-500/30 rounded-lg p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Failed</p>
              <p className="text-3xl font-bold text-red-400 mt-1">{failed}</p>
            </div>
            <span className="text-4xl">❌</span>
          </div>
        </motion.div>

        {/* Total Tests Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 border border-blue-500/30 rounded-lg p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{total}</p>
            </div>
            <span className="text-4xl">📊</span>
          </div>
        </motion.div>
      </div>

      {/* Success Message */}
      {failed === 0 && passed > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 flex items-center space-x-3"
        >
          <span className="text-2xl">🎉</span>
          <p className="text-green-300 font-medium">
            All tests passed successfully!
          </p>
        </motion.div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {/* Raw Output Section */}
        {testResults.output && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection("output")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">📄</span>
                <span className="font-medium text-slate-200">Raw Output</span>
              </div>
              <motion.span
                animate={{ rotate: expandedSection === "output" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400"
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {expandedSection === "output" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-700"
                >
                  <div className="p-4 bg-slate-950/50">
                    <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
                      {testResults.output}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Error Details Section */}
        {testResults.errorDetails && (
          <div className="bg-slate-900/50 border border-red-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection("errors")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">⚠️</span>
                <span className="font-medium text-red-300">Error Details</span>
              </div>
              <motion.span
                animate={{ rotate: expandedSection === "errors" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400"
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {expandedSection === "errors" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-red-500/30"
                >
                  <div className="p-4 bg-red-950/20">
                    <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap overflow-x-auto">
                      {testResults.errorDetails}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Additional Info */}
        {testResults.details && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection("details")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">ℹ️</span>
                <span className="font-medium text-slate-200">
                  Additional Details
                </span>
              </div>
              <motion.span
                animate={{ rotate: expandedSection === "details" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400"
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {expandedSection === "details" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-700"
                >
                  <div className="p-4 bg-slate-950/50">
                    <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(testResults.details, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
