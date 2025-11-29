"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function ProductivityMetrics({ timeRange = 30 }) {
  const [productivity, setProductivity] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [effectiveness, setEffectiveness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const stats = await fetch("/api/data/statistics", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      setProductivity(stats.productivity);
      setLanguages(stats.languageStats);
      setEffectiveness(stats.effectiveness);
    } catch (error) {
      console.error("Error fetching productivity metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="text-center py-8">Loading productivity metrics...</div>
    );

  const metricsCards = [
    {
      label: "Total Sessions",
      value: productivity?.totalSessions || 0,
      icon: "🎯",
      color: "purple",
    },
    {
      label: "Files Created",
      value: productivity?.filesCreated || 0,
      icon: "📄",
      color: "green",
    },
    {
      label: "Files Modified",
      value: productivity?.filesModified || 0,
      icon: "✏️",
      color: "blue",
    },
    {
      label: "Lines of Code",
      value: productivity?.linesOfCodeWritten || 0,
      icon: "💻",
      color: "pink",
    },
    {
      label: "Tests Generated",
      value: productivity?.testsGenerated || 0,
      icon: "🧪",
      color: "yellow",
    },
    {
      label: "Bugs Fixed",
      value: productivity?.bugsFixed || 0,
      icon: "🐛",
      color: "red",
    },
    {
      label: "Code Refactored",
      value: productivity?.codeRefactored || 0,
      icon: "🔧",
      color: "indigo",
    },
    {
      label: "Avg Session",
      value: productivity?.avgSessionDuration
        ? (productivity.avgSessionDuration / 60000).toFixed(1) + "m"
        : "0m",
      icon: "⏱️",
      color: "cyan",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricsCards.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{metric.icon}</span>
              <div
                className={`w-2 h-2 rounded-full bg-${metric.color}-500`}
              ></div>
            </div>
            <p className="text-gray-400 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Effectiveness Scores */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Effectiveness Scores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Overall Score</span>
                <span className="text-sm font-bold">
                  {effectiveness?.overallScore?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${effectiveness?.overallScore || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Code Quality</span>
                <span className="text-sm font-bold">
                  {effectiveness?.codeQuality?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${effectiveness?.codeQuality || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Test Coverage</span>
                <span className="text-sm font-bold">
                  {effectiveness?.testCoverage?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${effectiveness?.testCoverage || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">AI Acceptance Rate</span>
                <span className="text-sm font-bold">
                  {effectiveness?.aiAcceptanceRate?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${effectiveness?.aiAcceptanceRate || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Execution Success Rate</span>
                <span className="text-sm font-bold">
                  {effectiveness?.executionSuccessRate?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${effectiveness?.executionSuccessRate || 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Overall Rating */}
            <div className="bg-gray-900/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm mb-2">Overall Productivity</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {effectiveness?.overallScore
                  ? effectiveness.overallScore >= 80
                    ? "Excellent"
                    : effectiveness.overallScore >= 60
                    ? "Good"
                    : effectiveness.overallScore >= 40
                    ? "Average"
                    : "Needs Improvement"
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Language Distribution */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Language Distribution</h2>
        <div className="space-y-3">
          {languages?.slice(0, 10).map((lang, index) => (
            <motion.div
              key={lang.language}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4"
            >
              <div className="w-24 text-sm font-medium">{lang.language}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-700 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-6 rounded-full flex items-center justify-end px-2 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (lang.totalFiles /
                          Math.max(...languages.map((l) => l.totalFiles))) *
                          100,
                        100
                      )}%`,
                    }}
                  >
                    <span className="text-xs font-bold">{lang.totalFiles}</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-400 w-32 text-right">
                {lang.linesWritten.toLocaleString()} lines
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Time */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Activity Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Total Active Time</p>
            <p className="text-2xl font-bold mt-2">
              {productivity?.totalActiveTime
                ? (productivity.totalActiveTime / 3600000).toFixed(1)
                : 0}
              h
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Avg per Session</p>
            <p className="text-2xl font-bold mt-2">
              {productivity?.avgSessionDuration
                ? (productivity.avgSessionDuration / 60000).toFixed(1)
                : 0}
              m
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Files per Session</p>
            <p className="text-2xl font-bold mt-2">
              {productivity?.totalSessions > 0
                ? (
                    (productivity.filesCreated + productivity.filesModified) /
                    productivity.totalSessions
                  ).toFixed(1)
                : 0}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Lines per File</p>
            <p className="text-2xl font-bold mt-2">
              {productivity?.filesCreated + productivity?.filesModified > 0
                ? Math.round(
                    productivity.linesOfCodeWritten /
                      (productivity.filesCreated + productivity.filesModified)
                  )
                : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
