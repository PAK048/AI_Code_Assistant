"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function ChatHistoryList({ timeRange = 7 }) {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchChatHistories();
  }, [timeRange]);

  const fetchChatHistories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/data/chat/histories?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setHistories(data);
    } catch (error) {
      console.error("Error fetching chat histories:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchMessages = async () => {
    if (!searchQuery.trim()) return fetchChatHistories();

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/data/chat/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setHistories(data);
    } catch (error) {
      console.error("Error searching messages:", error);
    }
  };

  if (loading)
    return <div className="text-center py-8">Loading chat history...</div>;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && searchMessages()}
            placeholder="Search messages..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={searchMessages}
            className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Chat History List */}
      <div className="space-y-4">
        {histories.map((history, index) => (
          <motion.div
            key={history._id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">
                  Session {history.sessionId?.name || "Untitled"}
                </h3>
                <p className="text-sm text-gray-400">
                  {new Date(history.createdAt).toLocaleDateString()} •{" "}
                  {history.summary?.totalMessages || 0} messages
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Tokens Used</p>
                <p className="text-lg font-bold text-purple-400">
                  {history.summary?.totalTokens || 0}
                </p>
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.messages?.slice(-3).map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    msg.role === "user" ? "bg-blue-900/30" : "bg-purple-900/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase">
                      {msg.role}
                    </span>
                    {msg.metadata?.actionType && (
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                        {msg.metadata.actionType}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
