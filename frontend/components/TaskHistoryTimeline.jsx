"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function TaskHistoryTimeline({ timeRange = 30 }) {
  const [tasks, setTasks] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const [tasksRes, timelineRes, statsRes] = await Promise.all([
        fetch("/api/data/agent/tasks?limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/data/agent/tasks/timeline?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/data/agent/tasks/statistics?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setTasks(await tasksRes.json());
      setTimeline(await timelineRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error("Error fetching task history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="text-center py-8">Loading task history...</div>;

  const taskTypeIcons = {
    code_review: "🔍",
    refactoring: "🔧",
    test_generation: "🧪",
    quality_metrics: "📊",
    prediction: "🔮",
    code_completion: "✨",
    bug_fix: "🐛",
    documentation: "📝",
    optimization: "⚡",
  };

  const statusColors = {
    completed: "bg-green-600",
    in_progress: "bg-blue-600",
    pending: "bg-yellow-600",
    failed: "bg-red-600",
    cancelled: "bg-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Completion Rate</p>
          <p className="text-2xl font-bold mt-1 text-green-400">
            {stats?.completionRate || 0}%
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Avg Duration</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">
            {stats?.performance?.avgDuration
              ? (stats.performance.avgDuration / 1000).toFixed(1)
              : 0}
            s
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Avg Effectiveness</p>
          <p className="text-2xl font-bold mt-1 text-purple-400">
            {stats?.performance?.avgEffectiveness?.toFixed(1) || 0}%
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Avg Tokens</p>
          <p className="text-2xl font-bold mt-1 text-pink-400">
            {Math.round(stats?.performance?.avgTokens) || 0}
          </p>
        </div>
      </div>

      {/* Most Used Task Types */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Most Used Task Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats?.mostUsedTaskTypes?.map((task, index) => (
            <div key={index} className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {taskTypeIcons[task.taskType] || "🤖"}
                </span>
                <span className="font-medium text-sm">{task.taskType}</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{task.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Task Timeline</h2>
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-8 pb-4 border-l-2 border-gray-700 last:border-0"
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-purple-600 border-2 border-gray-800"></div>

              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {taskTypeIcons[task.taskType] || "🤖"}
                    </span>
                    <span className="font-medium">{task.taskType}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        statusColors[task.status]
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(task.createdAt).toLocaleString()}
                  </span>
                </div>

                {task.input?.fileName && (
                  <p className="text-sm text-gray-400 mb-2">
                    File: {task.input.fileName}
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Duration</p>
                    <p className="font-medium">
                      {task.performance?.duration
                        ? (task.performance.duration / 1000).toFixed(2)
                        : 0}
                      s
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tokens</p>
                    <p className="font-medium">
                      {task.aiMetadata?.tokensUsed || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Effectiveness</p>
                    <p className="font-medium">
                      {task.effectivenessScore?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">User Rating</p>
                    <p className="font-medium">
                      {task.userFeedback?.rating
                        ? "⭐".repeat(task.userFeedback.rating)
                        : "Not rated"}
                    </p>
                  </div>
                </div>

                {task.output?.explanation && (
                  <div className="mt-3 p-2 bg-gray-800/50 rounded text-sm text-gray-300">
                    {task.output.explanation.substring(0, 150)}...
                  </div>
                )}

                {task.userFeedback?.comment && (
                  <div className="mt-2 p-2 bg-blue-900/20 rounded text-sm">
                    💬 {task.userFeedback.comment}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
