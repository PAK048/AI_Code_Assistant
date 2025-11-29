"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import FileTabBar from "../../components/FileTabBar";
import CodeEditor from "../../components/CodeEditor";
import FileActionsPanel from "../../components/FileActionsPanel";
import MetricsPanel from "../../components/MetricsPanel";
import ProjectHealthDashboard from "../../components/ProjectHealthDashboard";

/**
 * Software Metrics Page
 *
 * Dedicated page for code editing and quality metrics analysis.
 * Features:
 * - Multi-file management with upload/drag-drop/paste
 * - Code editor with syntax highlighting
 * - File actions panel
 * - Metrics Panel for code quality analysis
 * - Project Health Dashboard
 */
export default function MetricsPage() {
  const [activeView, setActiveView] = useState("editor"); // editor | metrics | health
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const projectPath =
    "/media/usama_ijaz/Data/Data/Hackathons/IBM_Watson_Orchestrate_Nov/CodeEcho-main";

  // Get active file object
  const activeFile = files.find((f) => f.id === activeFileId) || null;

  // Load session files on mount
  useEffect(() => {
    loadSessionFiles();
  }, []);

  const loadSessionFiles = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/agents/session/files`);
      const data = await response.json();

      if (data.success) {
        setFiles(data.files);
        setActiveFileId(data.activeFileId);
      }
    } catch (err) {
      console.error("Failed to load session files:", err);
    }
  };

  const handleAddFile = async (filePath) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/agents/session/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      const data = await response.json();

      if (data.success) {
        setFiles([...files, data.file]);
        setActiveFileId(data.file.id);
      } else {
        setError(data.error || "Failed to add file");
      }
    } catch (err) {
      setError(err.message);
      console.error("Add file error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (fileData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/agents/session/files/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fileData.name,
            content: fileData.content,
            language: fileData.language,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setFiles([...files, data.file]);
        setActiveFileId(data.file.id);
      } else {
        setError(data.error || "Failed to upload file");
      }
    } catch (err) {
      setError(err.message);
      console.error("File upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = async (fileData) => {
    await handleFileUpload(fileData);
  };

  const handlePasteContent = async (fileData) => {
    await handleFileUpload(fileData);
  };

  const handleFileSelect = async (fileId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/agents/session/files/${fileId}/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (data.success) {
        setActiveFileId(fileId);
      }
    } catch (err) {
      console.error("File select error:", err);
    }
  };

  const handleFileClose = async (fileId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/agents/session/files/${fileId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        setFiles(files.filter((f) => f.id !== fileId));

        if (activeFileId === fileId) {
          const remainingFiles = files.filter((f) => f.id !== fileId);
          setActiveFileId(
            remainingFiles.length > 0 ? remainingFiles[0].id : null
          );
        }
      }
    } catch (err) {
      console.error("File close error:", err);
    }
  };

  const handleFileChange = useCallback(
    (content) => {
      if (!activeFileId) return;

      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === activeFileId
            ? { ...f, content, isDirty: content !== f.savedContent }
            : f
        )
      );
    },
    [activeFileId]
  );

  const handleFileSave = async (content) => {
    if (!activeFileId) return;

    try {
      const updateResponse = await fetch(
        `${backendUrl}/api/agents/session/files/${activeFileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error("Failed to update file content");
      }

      const saveResponse = await fetch(
        `${backendUrl}/api/agents/session/files/${activeFileId}/save`,
        {
          method: "POST",
        }
      );

      const data = await saveResponse.json();

      if (data.success) {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === activeFileId
              ? { ...f, content, savedContent: content, isDirty: false }
              : f
          )
        );
      } else {
        setError(data.error || "Failed to save file");
      }
    } catch (err) {
      setError(err.message);
      console.error("File save error:", err);
    }
  };

  const handleFileClick = (filePath) => {
    setActiveView("metrics");
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* File Tabs */}
      <FileTabBar
        files={files}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onFileClose={handleFileClose}
        onAddFile={handleAddFile}
        onFileUpload={handleFileUpload}
        onFileDrop={handleFileDrop}
        onPasteContent={handlePasteContent}
      />

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700/50 text-red-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* View Toggle */}
      <div className="bg-slate-900/90 border-b border-slate-700/50 py-3 px-4">
        <div className="flex justify-center">
          <div className="inline-flex space-x-2 bg-slate-800/50 rounded-lg p-1">
            <motion.button
              onClick={() => setActiveView("editor")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeView === "editor"
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ✏️ Editor
              {activeView === "editor" && (
                <motion.div
                  layoutId="activeMetricsView"
                  className="absolute inset-0 bg-slate-700/70 rounded-md -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
            <motion.button
              onClick={() => setActiveView("metrics")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeView === "metrics"
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📊 Metrics
              {activeView === "metrics" && (
                <motion.div
                  layoutId="activeMetricsView"
                  className="absolute inset-0 bg-slate-700/70 rounded-md -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
            <motion.button
              onClick={() => setActiveView("health")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeView === "health"
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🏥 Health
              {activeView === "health" && (
                <motion.div
                  layoutId="activeMetricsView"
                  className="absolute inset-0 bg-slate-700/70 rounded-md -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === "editor" ? (
          <div className="h-full flex">
            {/* Left Panel - Code Editor (60%) */}
            <div className="flex-1" style={{ flex: "0 0 60%" }}>
              <CodeEditor
                file={activeFile}
                onChange={handleFileChange}
                onSave={handleFileSave}
              />
            </div>

            {/* Right Panel - File Actions (40%) */}
            <div className="flex-shrink-0" style={{ flex: "0 0 40%" }}>
              <FileActionsPanel file={activeFile} backendUrl={backendUrl} />
            </div>
          </div>
        ) : activeView === "metrics" ? (
          <div className="h-full overflow-y-auto p-6">
            <MetricsPanel
              isOpen={true}
              onClose={() => {}}
              currentFilePath={activeFile?.path || ""}
              projectPath={projectPath}
              inline={true}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-6">
              <ProjectHealthDashboard
                projectPath={projectPath}
                onFileClick={handleFileClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 shadow-2xl">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white mt-4 text-center">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
