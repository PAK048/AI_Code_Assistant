"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FileTabBar Component
 *
 * Displays tabs for all open files in the session, similar to ChatGPT-style tabs.
 * Features:
 * - Tab switching with active highlighting
 * - Close button per tab
 * - Add file button
 * - File type icons
 * - Dirty state indicator (unsaved changes)
 * - Responsive scrolling for many tabs
 */
export default function FileTabBar({
  files = [],
  activeFileId,
  onFileSelect,
  onFileClose,
  onAddFile,
  onFileUpload,
  onFileDrop,
  onPasteContent,
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [pasteFileName, setPasteFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const getLanguageIcon = (language) => {
    const icons = {
      javascript: "JS",
      javascriptreact: "JSX",
      typescript: "TS",
      typescriptreact: "TSX",
      python: "PY",
      java: "☕",
      cpp: "C++",
      c: "C",
      csharp: "C#",
      go: "GO",
      rust: "🦀",
      ruby: "💎",
      php: "🐘",
      swift: "🍎",
      kotlin: "KT",
      html: "HTML",
      css: "CSS",
      json: "{}",
      markdown: "MD",
      plaintext: "📄",
    };
    return icons[language] || "📄";
  };

  const getLanguageColor = (language) => {
    const colors = {
      javascript: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      javascriptreact: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      typescript: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      typescriptreact: "bg-blue-400/20 text-blue-200 border-blue-400/30",
      python: "bg-green-500/20 text-green-300 border-green-500/30",
      java: "bg-red-500/20 text-red-300 border-red-500/30",
      cpp: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      c: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };
    return (
      colors[language] || "bg-slate-600/20 text-slate-300 border-slate-600/30"
    );
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    uploadedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        onFileUpload({
          name: file.name,
          content: event.target.result,
          language: detectLanguage(file.name),
        });
      };
      reader.readAsText(file);
    });
    setShowAddMenu(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        onFileDrop({
          name: file.name,
          content: event.target.result,
          language: detectLanguage(file.name),
        });
      };
      reader.readAsText(file);
    });
  };

  const handlePasteContent = () => {
    if (pasteContent.trim() && pasteFileName.trim()) {
      onPasteContent({
        name: pasteFileName.trim(),
        content: pasteContent,
        language: detectLanguage(pasteFileName.trim()),
      });
      setPasteContent("");
      setPasteFileName("");
      setShowAddMenu(false);
    }
  };

  const detectLanguage = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascriptreact",
      ts: "typescript",
      tsx: "typescriptreact",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      go: "go",
      rs: "rust",
      rb: "ruby",
      php: "php",
      swift: "swift",
      kt: "kotlin",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
    };
    return languageMap[ext] || "plaintext";
  };

  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      setShowAddMenu(false);
      setPasteContent("");
      setPasteFileName("");
    }
  };

  return (
    <div
      className={`bg-slate-900/90 border-b border-slate-700/50 backdrop-blur-sm transition-colors ${
        isDragging ? "bg-emerald-900/30 border-emerald-500" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* File Tabs */}
        <div className="flex items-center gap-1 p-2 flex-1 min-w-0">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex-shrink-0"
              >
                <div
                  onClick={() => onFileSelect(file.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onFileSelect(file.id);
                    }
                  }}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                    activeFileId === file.id
                      ? "bg-slate-700/70 text-white shadow-md"
                      : "bg-slate-800/40 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                  }`}
                >
                  {/* Language Icon */}
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded border ${getLanguageColor(
                      file.language
                    )}`}
                  >
                    {getLanguageIcon(file.language)}
                  </span>

                  {/* File Name */}
                  <span className="text-sm font-medium max-w-[120px] truncate">
                    {file.name}
                  </span>

                  {/* Dirty Indicator */}
                  {file.isDirty && (
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                      title="Unsaved changes"
                    />
                  )}

                  {/* Close Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileClose(file.id);
                    }}
                    className={`ml-1 w-5 h-5 rounded flex items-center justify-center transition-all ${
                      activeFileId === file.id
                        ? "hover:bg-slate-600 text-slate-400 hover:text-white"
                        : "opacity-0 group-hover:opacity-100 hover:bg-slate-600 text-slate-500 hover:text-white"
                    }`}
                    title="Close file"
                  >
                    <svg
                      className="w-3 h-3"
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add File Button */}
        <div className="flex-shrink-0 p-2">
          {showAddMenu ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-3 bg-slate-800/60 rounded-lg p-4 border border-slate-600 min-w-[400px]"
              onKeyDown={handleKeyPress}
            >
              {/* Upload File */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  📁 Upload File(s)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-emerald-600 file:text-white
                    hover:file:bg-emerald-700
                    file:cursor-pointer cursor-pointer"
                />
              </div>

              <div className="text-xs text-slate-500 text-center">OR</div>

              {/* Paste Content */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  📋 Paste Content
                </label>
                <input
                  type="text"
                  value={pasteFileName}
                  onChange={(e) => setPasteFileName(e.target.value)}
                  placeholder="Filename (e.g., app.js)"
                  className="bg-slate-900 text-white text-sm px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 w-full mb-2"
                />
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste your code here..."
                  className="bg-slate-900 text-white text-sm px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 w-full h-32 resize-none font-mono"
                />
                <button
                  onClick={handlePasteContent}
                  disabled={!pasteContent.trim() || !pasteFileName.trim()}
                  className="mt-2 w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm rounded transition"
                >
                  Add from Paste
                </button>
              </div>

              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setPasteContent("");
                  setPasteFileName("");
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition"
                title="Cancel"
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowAddMenu(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-700/50 text-slate-400 hover:text-white rounded-lg transition-all border border-dashed border-slate-600 hover:border-slate-500"
              title="Add new file"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-medium">Add File</span>
            </button>
          )}
        </div>
      </div>

      {/* Drag-and-Drop Indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-slate-900/90 px-6 py-4 rounded-lg">
            <p className="text-emerald-400 text-lg font-semibold">
              📂 Drop files here
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && !showAddMenu && (
        <div className="p-8 text-center">
          <p className="text-slate-500 text-sm mb-3">No files open</p>
          <p className="text-slate-600 text-xs mb-4">
            Upload, drag & drop, or paste your code to get started
          </p>
          <button
            onClick={() => setShowAddMenu(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium text-sm"
          >
            + Add Your First File
          </button>
        </div>
      )}
    </div>
  );
}
