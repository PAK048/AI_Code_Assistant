"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CodeEditor Component
 *
 * Simple code editor with syntax highlighting (using textarea for now, can be upgraded to Monaco Editor).
 * Features:
 * - Line numbers
 * - Syntax highlighting classes
 * - Save functionality
 * - Auto-save indicator
 * - Keyboard shortcuts (Ctrl+S to save)
 */
export default function CodeEditor({ file, onSave, onChange }) {
  const [content, setContent] = useState(file?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (file) {
      setContent(file.content);
    }
  }, [file?.id]); // Only update when file changes

  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange?.(newContent);
  };

  const handleSave = async () => {
    if (!file || isSaving) return;

    setIsSaving(true);
    try {
      await onSave?.(content);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }

    // Tab key support
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newContent =
        content.substring(0, start) + "  " + content.substring(end);
      setContent(newContent);
      onChange?.(newContent);

      // Set cursor position after tab
      setTimeout(() => {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          start + 2;
      }, 0);
    }
  };

  const getLineNumbers = () => {
    const lines = content.split("\n");
    return lines.map((_, index) => index + 1).join("\n");
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900/40 backdrop-blur">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-slate-500 text-lg font-medium">No file selected</p>
          <p className="text-slate-600 text-sm mt-2">
            Open a file to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900/40 backdrop-blur">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-medium">{file.name}</span>
          <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded">
            {file.language}
          </span>
          {file.isDirty && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <svg
                className="w-3 h-3 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={!file.isDirty || isSaving}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm rounded transition font-medium flex items-center gap-2"
            title="Save file (Ctrl+S)"
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
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div className="flex-shrink-0 bg-slate-900/60 text-slate-600 text-right px-3 py-4 font-mono text-sm select-none border-r border-slate-700/50 overflow-hidden">
          <pre className="leading-6">{getLineNumbers()}</pre>
        </div>

        {/* Code Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 w-full h-full bg-transparent text-slate-200 font-mono text-sm px-4 py-4 resize-none focus:outline-none leading-6"
            spellCheck={false}
            placeholder="Start typing code..."
          />
        </div>
      </div>

      {/* Editor Footer */}
      <div className="px-4 py-2 bg-slate-800/60 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>Lines: {content.split("\n").length}</span>
          <span>Characters: {content.length}</span>
          <span>Language: {file.language}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Ctrl+S to save</span>
        </div>
      </div>
    </div>
  );
}
