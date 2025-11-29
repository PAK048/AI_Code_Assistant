"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function ExecutionLogsViewer({ timeRange = 7 }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeRange, filter]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const filterParam = filter !== "all" ? `&status=${filter}` : "";

      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/data/execution/logs?limit=20${filterParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/data/execution/statistics?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setLogs(await logsRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error("Error fetching execution logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="text-center py-8">Loading execution logs...</div>;

  const statusColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    timeout: "bg-yellow-600",
    cancelled: "bg-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Executions</p>
          <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Success Rate</p>
          <p className="text-2xl font-bold mt-1 text-green-400">
            {stats?.successRate || 0}%
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Avg Duration</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">
            {stats?.avgDuration ? (stats.avgDuration / 1000).toFixed(2) : 0}s
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Types</p>
          <p className="text-2xl font-bold mt-1">
            {stats?.byType?.length || 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "success", "error", "timeout"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg capitalize transition-all ${
              filter === f ? "bg-purple-600" : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {logs.map((log, index) => (
          <motion.div
            key={log._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    statusColors[log.result?.status] || "bg-gray-600"
                  }`}
                >
                  {log.result?.status}
                </span>
                <span className="text-sm text-gray-400">
                  {log.executionType}
                </span>
                <span className="text-sm font-medium">{log.fileName}</span>
              </div>
              <span className="text-sm text-gray-400">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Language</p>
                <p className="font-medium">{log.language}</p>
              </div>
              <div>
                <p className="text-gray-400">Duration</p>
                <p className="font-medium">
                  {(log.performance?.duration / 1000).toFixed(2)}s
                </p>
              </div>
              <div>
                <p className="text-gray-400">Exit Code</p>
                <p className="font-medium">{log.result?.exitCode ?? "N/A"}</p>
              </div>
            </div>

            {log.result?.error && (
              <div className="mt-3 p-3 bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-400">
                  {log.result.error.message}
                </p>
              </div>
            )}

            {log.testResults && log.testResults.total > 0 && (
              <div className="mt-3 flex gap-4 text-sm">
                <span className="text-green-400">
                  ✓ {log.testResults.passed} passed
                </span>
                <span className="text-red-400">
                  ✗ {log.testResults.failed} failed
                </span>
                <span className="text-gray-400">
                  ⊘ {log.testResults.skipped} skipped
                </span>
                <span className="text-blue-400">
                  Coverage: {log.testResults.coverage}%
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
