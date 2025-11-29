"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TestResultDisplay from "./TestResultDisplay";

/**
 * TestingPanel Component
 *
 * Complete standalone interface for:
 * - Uploading code files (drag & drop, button)
 * - Generating tests
 * - Executing tests
 * - Displaying results
 *
 * State Machine: NO_FILE → FILE_UPLOADED → TEST_GENERATED → TEST_EXECUTED
 */
export default function TestingPanel({ backendUrl }) {
  // State machine states
  const [state, setState] = useState("NO_FILE");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [generatedTests, setGeneratedTests] = useState(null);
  const [testResults, setTestResults] = useState(null);

  // Loading states
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const executingRef = useRef(false);

  // Detect language from filename
  const detectLanguage = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      go: "go",
      rs: "rust",
      rb: "ruby",
      php: "php",
    };
    return languageMap[ext] || "plaintext";
  };

  // File upload handler
  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = {
        name: file.name,
        content: event.target.result,
        language: detectLanguage(file.name),
        path: file.name,
      };
      setUploadedFile(fileData);
      setState("FILE_UPLOADED");
      // Reset subsequent states
      setGeneratedTests(null);
      setTestResults(null);
    };
    reader.readAsText(file);
  };

  // Upload button handler
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Drag and drop handlers
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

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Generate tests handler
  const handleGenerateTests = async () => {
    if (!uploadedFile || generating) return;

    setGenerating(true);
    setGeneratedTests(null);
    setTestResults(null);

    try {
      console.log("Generating tests for file:", uploadedFile.name);
      const response = await fetch(`${backendUrl}/api/agents/generate-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: uploadedFile.path,
          code: uploadedFile.content,
        }),
      });

      const data = await response.json();
      console.log("Test generation response:", data);

      if (data.success && data.testCode) {
        setGeneratedTests({
          testCode: data.testCode,
          framework: data.framework,
          language: data.language,
          usedFallback: data.usedFallback,
        });
        setState("TEST_GENERATED");
      } else {
        console.error("Test generation failed:", data.error);
        alert(
          `Failed to generate tests: ${
            data.error || data.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Generate tests error:", error);
      alert(`Error generating tests: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Execute tests handler
  const handleExecuteTests = async () => {
    // Prevent double execution
    if (executingRef.current || executing) {
      console.log("Tests already executing, ignoring click...");
      return;
    }

    if (!generatedTests?.testCode) {
      console.error("No test code available to execute");
      alert("No test code available. Please generate tests first.");
      return;
    }

    executingRef.current = true;
    setExecuting(true);
    setTestResults(null);

    try {
      console.log("Executing tests with framework:", generatedTests.framework);
      const response = await fetch(`${backendUrl}/api/agents/execute-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCode: generatedTests.testCode,
          framework: generatedTests.framework || "Jest",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Test execution complete:", data);
      setTestResults(data);
      setState("TEST_EXECUTED");

      // Show notification based on results
      if (data.success && data.summary) {
        if (data.summary.failed === 0 && data.summary.passed > 0) {
          console.log(`🎉 All ${data.summary.passed} tests passed!`);
        } else if (data.summary.failed > 0) {
          console.log(`⚠️ ${data.summary.failed} test(s) failed`);
        }
      }
    } catch (error) {
      console.error("❌ Test execution error:", error);
      setTestResults({
        success: false,
        error: error.message,
        message: "Failed to execute tests. Check console for details.",
      });
    } finally {
      setExecuting(false);
      executingRef.current = false;
    }
  };

  // Edit test code handler
  const handleTestCodeChange = (newCode) => {
    setGeneratedTests({
      ...generatedTests,
      testCode: newCode,
    });
  };

  // Reset handler
  const handleReset = () => {
    setUploadedFile(null);
    setGeneratedTests(null);
    setTestResults(null);
    setState("NO_FILE");
  };

  return (
    <div className="space-y-6">
      {/* Section 1: File Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border border-slate-700 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-200 flex items-center space-x-2">
            <span>📁</span>
            <span>Upload Code File</span>
          </h2>
          {uploadedFile && (
            <button
              onClick={handleReset}
              className="text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear & Reset
            </button>
          )}
        </div>

        {!uploadedFile ? (
          <div className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-600 hover:border-slate-500 bg-slate-800/30"
              }`}
              onClick={handleUploadClick}
            >
              <div className="space-y-3">
                <div className="text-5xl">📤</div>
                <div>
                  <p className="text-lg font-medium text-slate-300">
                    Drop a file here or click to upload
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Supports .js, .py, .ts, .java, .cpp, and more
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.rb,.php"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Upload Button */}
            <button
              onClick={handleUploadClick}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>📎</span>
              <span>Choose File to Upload</span>
            </button>
          </div>
        ) : (
          // File preview
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-slate-200">
                      {uploadedFile.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {uploadedFile.language} • {uploadedFile.content.length}{" "}
                      characters
                    </p>
                  </div>
                </div>
                <span className="text-2xl">✅</span>
              </div>

              {/* Code preview */}
              <div className="bg-slate-950 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                  {uploadedFile.content.slice(0, 500)}
                  {uploadedFile.content.length > 500 && "..."}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Section 2: Generate Tests */}
      <AnimatePresence>
        {state !== "NO_FILE" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900/50 border border-slate-700 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-slate-200 flex items-center space-x-2 mb-4">
              <span>🧪</span>
              <span>Generate Tests</span>
            </h2>

            {!generatedTests ? (
              <button
                onClick={handleGenerateTests}
                disabled={generating}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {generating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Generating Tests...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate Tests</span>
                  </>
                )}
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 flex items-center space-x-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-medium text-emerald-300">
                      Tests Generated Successfully!
                    </p>
                    <p className="text-sm text-slate-400">
                      Framework: {generatedTests.framework} •{" "}
                      {generatedTests.testCode.split("\n").length} lines
                    </p>
                  </div>
                </div>

                {/* Generated test code editor */}
                <div className="bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                    <p className="text-sm font-medium text-slate-300">
                      Generated Test Code (Editable)
                    </p>
                  </div>
                  <textarea
                    value={generatedTests.testCode}
                    onChange={(e) => handleTestCodeChange(e.target.value)}
                    className="w-full h-80 bg-slate-950 text-slate-300 font-mono text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    spellCheck={false}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 3: Execute Tests */}
      <AnimatePresence>
        {state === "TEST_GENERATED" || state === "TEST_EXECUTED" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900/50 border border-slate-700 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-slate-200 flex items-center space-x-2 mb-4">
              <span>▶️</span>
              <span>Execute Tests</span>
            </h2>

            <button
              onClick={handleExecuteTests}
              disabled={executing}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 mb-6"
            >
              {executing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  <span>Executing Tests...</span>
                </>
              ) : (
                <>
                  <span>▶️</span>
                  <span>Execute Tests</span>
                </>
              )}
            </button>

            {/* Test Results */}
            {testResults && <TestResultDisplay testResults={testResults} />}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* State Indicator (for debugging) */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-slate-600 text-center">
          Current State: {state}
        </div>
      )}
    </div>
  );
}
