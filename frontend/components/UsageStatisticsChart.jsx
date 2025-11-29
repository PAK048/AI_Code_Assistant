"use client";

import { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Usage Statistics Chart Component
 * Displays activity timeline and usage patterns
 */
export default function UsageStatisticsChart({ timeRange = 30 }) {
  const [timeline, setTimeline] = useState([]);
  const [aiUsage, setAiUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const [timelineRes, aiUsageRes] = await Promise.all([
        fetch(`/api/data/statistics/timeline?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/data/statistics/ai", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const timelineData = await timelineRes.json();
      const aiUsageData = await aiUsageRes.json();

      setTimeline(timelineData);
      setAiUsage(aiUsageData);
    } catch (error) {
      console.error("Error fetching usage statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  // Prepare activity timeline chart data
  const activityChartData = {
    labels: timeline.map((d) =>
      new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    ),
    datasets: [
      {
        label: "Messages",
        data: timeline.map((d) => d.messages || 0),
        borderColor: "rgb(147, 51, 234)",
        backgroundColor: "rgba(147, 51, 234, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Executions",
        data: timeline.map((d) => d.executions || 0),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "AI Tasks",
        data: timeline.map((d) => d.agentTasks || 0),
        borderColor: "rgb(236, 72, 153)",
        backgroundColor: "rgba(236, 72, 153, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Prepare AI usage by task type chart
  const aiTaskTypeData = {
    labels: aiUsage?.byTaskType?.map((t) => t.taskType) || [],
    datasets: [
      {
        label: "Requests",
        data: aiUsage?.byTaskType?.map((t) => t.requests) || [],
        backgroundColor: [
          "rgba(147, 51, 234, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(251, 191, 36, 0.8)",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: "#fff" },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: { color: "#9ca3af" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      y: {
        ticks: { color: "#9ca3af" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Activity Timeline */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
        <div style={{ height: "400px" }}>
          <Line data={activityChartData} options={chartOptions} />
        </div>
      </div>

      {/* AI Usage Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Task Type */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">AI Usage by Task Type</h2>
          <div style={{ height: "300px" }}>
            <Bar data={aiTaskTypeData} options={chartOptions} />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">AI Usage Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">Total Requests</span>
              <span className="text-2xl font-bold text-purple-400">
                {aiUsage?.totalRequests?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">Total Tokens</span>
              <span className="text-2xl font-bold text-blue-400">
                {aiUsage?.totalTokens?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">Avg Tokens/Request</span>
              <span className="text-2xl font-bold text-pink-400">
                {aiUsage?.totalRequests > 0
                  ? Math.round(aiUsage.totalTokens / aiUsage.totalRequests)
                  : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Type Details */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Task Type Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">Task Type</th>
                <th className="text-right py-3 px-4">Requests</th>
                <th className="text-right py-3 px-4">Tokens Used</th>
                <th className="text-right py-3 px-4">Avg Effectiveness</th>
              </tr>
            </thead>
            <tbody>
              {aiUsage?.byTaskType?.map((task, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30"
                >
                  <td className="py-3 px-4 font-medium">{task.taskType}</td>
                  <td className="py-3 px-4 text-right">{task.requests}</td>
                  <td className="py-3 px-4 text-right">
                    {task.tokensUsed?.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-1 bg-purple-600 rounded text-sm">
                      {task.avgEffectiveness?.toFixed(1) || 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
