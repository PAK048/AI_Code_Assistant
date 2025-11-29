"use client";

import { useState, useEffect, useCallback } from "react";
import FileTabBar from "./FileTabBar";
import CodeEditor from "./CodeEditor";
import FileActionsPanel from "./FileActionsPanel";

/**
 * MultiFileLayout Component
 *
 * Main layout orchestrating multi-file management.
 * Layout structure:
 * - Top: FileTabBar (file tabs)
 * - Middle: Split panel - CodeEditor (left 60%) | FileActionsPanel (right 40%)
 * - Bottom: Chat interface (passed as children)
 *
 * Features:
 * - Multi-file session management
 * - File CRUD operations via API
 * - Auto-save and manual save
 * - Per-file results caching
 * - IDE plugin sync support
 */
export default function MultiFileLayout({
  children,
  backendUrl = "http://localhost:5000",
}) {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    await handleFileUpload(fileData); // Use same logic as upload
  };

  const handlePasteContent = async (fileData) => {
    await handleFileUpload(fileData); // Use same logic as upload
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

        // If closed file was active, activate another
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

      // Update local state immediately for responsive UI
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === activeFileId
            ? { ...f, content, isDirty: content !== f.savedContent }
            : f
        )
      );

      // Debounced API update would go here for auto-save
    },
    [activeFileId]
  );

  const handleFileSave = async (content) => {
    if (!activeFileId) return;

    try {
      // Update content first
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

      // Save to disk
      const saveResponse = await fetch(
        `${backendUrl}/api/agents/session/files/${activeFileId}/save`,
        {
          method: "POST",
        }
      );

      const data = await saveResponse.json();

      if (data.success) {
        // Update local state to reflect saved status
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

      {/* Main Content Area - Split Panel */}
      <div className="flex-1 flex overflow-hidden">
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

      {/* Bottom Panel - Chat Interface (passed as children) */}
      <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-900/60 backdrop-blur">
        <div className="max-h-[40vh] overflow-y-auto">{children}</div>
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
