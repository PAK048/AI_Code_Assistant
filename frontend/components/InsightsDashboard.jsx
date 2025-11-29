"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UsageStatisticsChart from "./UsageStatisticsChart";
import ChatHistoryList from "./ChatHistoryList";
import ExecutionLogsViewer from "./ExecutionLogsViewer";
import TaskHistoryTimeline from "./TaskHistoryTimeline";
import ProductivityMetrics from "./ProductivityMetrics";

/**
 * Insights Dashboard Component
 * Main dashboard displaying user insights, statistics, and analytics
 */
export default function InsightsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // days

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "activity", label: "Activity", icon: "📈" },
    { id: "chat", label: "Chat History", icon: "💬" },
    { id: "executions", label: "Executions", icon: "⚡" },
    { id: "tasks", label: "AI Tasks", icon: "🤖" },
    { id: "productivity", label: "Productivity", icon: "🚀" },
  ];

  useEffect(() => {
    fetchInsights();
  }, [timeRange]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/data/insights", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch insights");

      const data = await response.json();
      setInsights(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchInsights}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-purple-500/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Insights Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Track your coding activity and AI usage
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    timeRange === days
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "overview" && (
            <OverviewTab insights={insights} timeRange={timeRange} />
          )}

          {activeTab === "activity" && (
            <UsageStatisticsChart timeRange={timeRange} />
          )}

          {activeTab === "chat" && <ChatHistoryList timeRange={timeRange} />}

          {activeTab === "executions" && (
            <ExecutionLogsViewer timeRange={timeRange} />
          )}

          {activeTab === "tasks" && (
            <TaskHistoryTimeline timeRange={timeRange} />
          )}

          {activeTab === "productivity" && (
            <ProductivityMetrics timeRange={timeRange} />
          )}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Overview Tab Component
 */
function OverviewTab({ insights, timeRange }) {
  if (!insights) return null;

  const stats = [
    {
      label: "Total AI Requests",
      value: insights.totalAIRequests,
      icon: "🤖",
      color: "purple",
    },
    {
      label: "Tokens Used",
      value: insights.totalTokensUsed?.toLocaleString() || 0,
      icon: "💎",
      color: "blue",
    },
    {
      label: "Files Created",
      value: insights.productivity?.filesCreated || 0,
      icon: "📄",
      color: "green",
    },
    {
      label: "Tests Generated",
      value: insights.productivity?.testsGenerated || 0,
      icon: "🧪",
      color: "yellow",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className="text-4xl">{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Most Used Commands */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Most Used Commands</h2>
        <div className="space-y-3">
          {insights.mostUsedCommands?.slice(0, 5).map((cmd, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{cmd.command}</p>
                  <p className="text-sm text-gray-400">
                    Success Rate: {cmd.successRate?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-400">{cmd.count}</p>
                <p className="text-xs text-gray-400">uses</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Features */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Top Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.topFeatures?.map((feature, index) => (
            <div key={index} className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{feature.feature}</p>
                <p className="text-purple-400 font-bold">{feature.count}</p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${feature.effectiveness}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Effectiveness: {feature.effectiveness?.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">
          Recent Activity (Last {timeRange} days)
        </h2>
        <div className="space-y-2">
          {insights.recentActivity?.slice(-7).map((day, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
            >
              <p className="text-gray-400">
                {new Date(day.date).toLocaleDateString()}
              </p>
              <div className="flex gap-4 text-sm">
                <span>💬 {day.messages}</span>
                <span>⚡ {day.executions}</span>
                <span>🤖 {day.agentTasks}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
