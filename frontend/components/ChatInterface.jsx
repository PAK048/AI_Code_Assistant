"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import InputPanel from "./InputPanel";
import CodeReviewModal from "./CodeReviewModal";
import SuggestionPanel from "./SuggestionPanel";
import MetricsPanel from "./MetricsPanel";
import TestManagementPanel from "./TestManagementPanel";
import ProjectHealthDashboard from "./ProjectHealthDashboard";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function ChatInterface() {
  // Load initial state from localStorage
  const [messages, setMessages] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codeecho_messages");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [candidateCode, setCandidateCode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("codeecho_candidate_code") || "";
    }
    return "";
  });

  const [pendingPath, setPendingPath] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("codeecho_pending_path") || "chat_gpt/sample.js"
      );
    }
    return "chat_gpt/sample.js";
  });

  const [showApprove, setShowApprove] = useState(false);

  const [runnerLogs, setRunnerLogs] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codeecho_runner_logs");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);
  const [gitOptions, setGitOptions] = useState({
    branchName: "",
    commitMessage: "",
    prTitle: "",
    prBody: "",
  });

  // Code review state
  const [showCodeReview, setShowCodeReview] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [refactoredCode, setRefactoredCode] = useState("");

  // Metrics panel state
  const [showMetrics, setShowMetrics] = useState(false);

  // Test management panel state
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Project health dashboard state
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [projectPath, setProjectPath] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("codeecho_project_path") ||
        "/media/usama_ijaz/Data/Data/Hackathons/IBM_Watson_Orchestrate_Nov/CodeEcho-main"
      );
    }
    return "/media/usama_ijaz/Data/Data/Hackathons/IBM_Watson_Orchestrate_Nov/CodeEcho-main";
  });

  const socket = useMemo(
    () => io(backendUrl, { transports: ["websocket"] }),
    []
  );

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("codeecho_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Save candidate code to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && candidateCode) {
      localStorage.setItem("codeecho_candidate_code", candidateCode);
    }
  }, [candidateCode]);

  // Save pending path to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && pendingPath) {
      localStorage.setItem("codeecho_pending_path", pendingPath);
    }
  }, [pendingPath]);

  // Save project path to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && projectPath) {
      localStorage.setItem("codeecho_project_path", projectPath);
    }
  }, [projectPath]);

  // Save runner logs to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && runnerLogs.length > 0) {
      localStorage.setItem("codeecho_runner_logs", JSON.stringify(runnerLogs));
    }
  }, [runnerLogs]);

  useEffect(() => {
    socket.on("agent_update", (payload) => {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: payload.message },
      ]);
    });

    socket.on("command_output", (payload) => {
      setRunnerLogs((prev) => [...prev, payload]);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const appendMessage = useCallback((role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  const handleTranscript = useCallback(
    async (transcript) => {
      appendMessage("user", transcript);
      setIsLoading(true);

      try {
        const intentRes = await fetch(`${backendUrl}/api/agents/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        }).then((res) => res.json());

        appendMessage("agent", `Intent detected: ${intentRes.type}`);

        const retrieval = await fetch(`${backendUrl}/api/agents/retrieve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: transcript, topK: 4 }),
        }).then((res) => res.json());

        const generation = await fetch(`${backendUrl}/api/agents/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: transcript,
            context: retrieval.results,
          }),
        }).then((res) => res.json());

        setCandidateCode(generation.code);
        setShowApprove(true);
      } catch (error) {
        appendMessage("agent", `Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [appendMessage]
  );

  const approveChanges = async () => {
    setIsLoading(true);
    try {
      await fetch(`${backendUrl}/api/agents/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: pendingPath,
          content: candidateCode,
          operation: "write",
        }),
      });
      appendMessage("agent", `Changes written to ${pendingPath}`);
      setShowApprove(false);
    } catch (error) {
      appendMessage("agent", `Failed to write file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runTests = async () => {
    await fetch(`${backendUrl}/api/agents/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "npm test" }),
    });
  };

  const handleGitWorkflow = async () => {
    setIsLoading(true);
    try {
      // Create branch
      await fetch(`${backendUrl}/api/agents/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_branch",
          branchName: gitOptions.branchName,
        }),
      });

      // Commit changes
      await fetch(`${backendUrl}/api/agents/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          message: gitOptions.commitMessage,
          files: ["."],
        }),
      });

      // Push branch
      await fetch(`${backendUrl}/api/agents/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push",
          branchName: gitOptions.branchName,
        }),
      });

      // Create PR
      const prRes = await fetch(`${backendUrl}/api/agents/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_pr",
          prOptions: {
            title: gitOptions.prTitle,
            body: gitOptions.prBody,
            head: gitOptions.branchName,
            base: "main",
            owner: process.env.NEXT_PUBLIC_GITHUB_OWNER,
            repo: process.env.NEXT_PUBLIC_GITHUB_REPO,
          },
        }),
      }).then((res) => res.json());

      if (prRes.success) {
        appendMessage("agent", `✅ PR created: ${prRes.prUrl}`);
      }
      setShowGitModal(false);
    } catch (error) {
      appendMessage("agent", `Git workflow error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all history and reset state
  const clearHistory = () => {
    if (
      confirm("Clear all chat history, code, and logs? This cannot be undone.")
    ) {
      setMessages([]);
      setCandidateCode("");
      setPendingPath("chat_gpt/sample.js");
      setRunnerLogs([]);

      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("codeecho_messages");
        localStorage.removeItem("codeecho_candidate_code");
        localStorage.removeItem("codeecho_pending_path");
        localStorage.removeItem("codeecho_runner_logs");
      }

      // Show confirmation
      setTimeout(() => {
        setMessages([
          { role: "agent", content: "✨ History cleared! Starting fresh." },
        ]);
      }, 100);
    }
  };

  // Code Review Functions
  const handleCodeReview = async () => {
    if (!candidateCode || !pendingPath) {
      appendMessage(
        "agent",
        "No code available to review. Generate code first."
      );
      return;
    }

    setIsReviewing(true);
    appendMessage("agent", `🔍 Starting AI code review for ${pendingPath}...`);

    try {
      const response = await fetch(`${backendUrl}/api/agents/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: pendingPath,
          code: candidateCode,
          useRAG: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReviewData(data);
        setShowCodeReview(true);
        appendMessage(
          "agent",
          `✅ Code review complete! Found ${data.analysis.issues.length} issues and ${data.analysis.suggestions.length} suggestions.`
        );
      } else {
        throw new Error(data.error || "Review failed");
      }
    } catch (error) {
      appendMessage("agent", `❌ Code review error: ${error.message}`);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApplyRefactoring = async (selectedSuggestions) => {
    setIsLoading(true);
    appendMessage(
      "agent",
      `🔧 Applying ${selectedSuggestions.length} refactoring suggestions...`
    );

    try {
      const response = await fetch(`${backendUrl}/api/agents/refactor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: pendingPath,
          code: candidateCode,
          approvedSuggestions: selectedSuggestions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRefactoredCode(data.refactoredCode);
        setCandidateCode(data.refactoredCode); // Update candidate code with refactored version
        appendMessage(
          "agent",
          `✅ Refactoring complete! Applied ${data.appliedSuggestions} suggestions.`
        );
        setShowCodeReview(false);
      } else {
        throw new Error(data.error || "Refactoring failed");
      }
    } catch (error) {
      appendMessage("agent", `❌ Refactoring error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreCommitReview = async () => {
    // Trigger code review before showing Git modal
    if (!candidateCode) {
      setShowGitModal(true);
      return;
    }

    setIsReviewing(true);
    appendMessage("agent", "🔍 Running pre-commit code review...");

    try {
      const response = await fetch(`${backendUrl}/api/agents/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: pendingPath,
          code: candidateCode,
          useRAG: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReviewData(data);

        // Check if there are critical or high severity issues
        const criticalIssues = data.analysis.issues.filter(
          (issue) => issue.severity === "critical" || issue.severity === "high"
        );

        if (criticalIssues.length > 0) {
          appendMessage(
            "agent",
            `⚠️ Found ${criticalIssues.length} critical/high severity issues. Please review before committing.`
          );
          setShowCodeReview(true);
        } else {
          appendMessage(
            "agent",
            "✅ Pre-commit review passed. Proceeding to Git workflow."
          );
          setShowGitModal(true);
        }
      } else {
        // Continue to Git workflow even if review fails
        appendMessage(
          "agent",
          "⚠️ Code review failed, but you can still proceed with Git."
        );
        setShowGitModal(true);
      }
    } catch (error) {
      appendMessage("agent", `⚠️ Pre-commit review error: ${error.message}`);
      setShowGitModal(true); // Allow proceeding despite error
    } finally {
      setIsReviewing(false);
    }
  };

  // Handle applying suggestions from SuggestionPanel
  const handleApplySuggestion = async (suggestion) => {
    if (suggestion.type === "test_code") {
      // Apply generated test code to a new test file
      const testFileName = pendingPath.replace(/\.[^.]+$/, ".test$&");
      setCandidateCode(suggestion.data.testCode);
      setPendingPath(testFileName);
      appendMessage("agent", `✅ Test code ready for ${testFileName}`);
    } else if (suggestion.type === "next_step") {
      appendMessage("agent", `💡 Next step: ${suggestion.data.title}`);
    }
  };

  // Handle file click from Project Health Dashboard
  const handleHealthDashboardFileClick = async (filePath, metrics) => {
    // Load file content and set as candidate code
    try {
      const response = await fetch(`${backendUrl}/api/agents/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          operation: "read",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCandidateCode(data.content);
        setPendingPath(filePath);
        appendMessage(
          "agent",
          `📂 Loaded ${filePath} from Project Health Dashboard`
        );

        // Show metrics in message
        if (metrics) {
          appendMessage(
            "agent",
            `📊 Metrics: Complexity ${metrics.cyclomaticComplexity}, ` +
              `Maintainability ${Math.round(metrics.maintainabilityIndex)}, ` +
              `Coverage ${Math.round(metrics.testCoverage)}%`
          );
        }

        // Close dashboard
        setShowHealthDashboard(false);
      }
    } catch (error) {
      appendMessage("agent", `Error loading file: ${error.message}`);
    }
  };

  return (
    <section className="space-y-6">
      {/* Input Panel with Text and Voice */}
      <div className="bg-slate-800/40 backdrop-blur rounded-lg p-6 border border-slate-700/50">
        <InputPanel onSubmit={handleTranscript} isLoading={isLoading} />

        {/* Clear History Button */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setShowHealthDashboard(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
              title="View project health dashboard"
            >
              📊 Project Health
            </button>
            <button
              onClick={() => setShowMetrics(true)}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
              title="View code quality metrics"
            >
              📈 Metrics
            </button>
            <button
              onClick={() => setShowTestPanel(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
              title="Manage and run tests"
            >
              🧪 Tests
            </button>
          </div>
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
            title="Clear all history"
          >
            🗑️ Clear History
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-emerald-400">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Processing agent workflow...</p>
          </div>
        )}
      </div>

      {/* Chat Messages Panel */}
      <div className="bg-slate-800/60 backdrop-blur rounded-lg p-4 h-72 overflow-y-auto space-y-3 border border-slate-700/50">
        {messages.length === 0 && (
          <p className="text-slate-500 text-sm italic">
            💡 Start by typing a command above or using voice input...
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`text-sm p-2 rounded ${
              msg.role === "user"
                ? "bg-emerald-900/20 text-emerald-300 border-l-2 border-emerald-500"
                : "bg-slate-700/30 text-slate-200"
            }`}
          >
            <span className="font-semibold text-xs uppercase opacity-70 mr-2">
              {msg.role}:
            </span>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 backdrop-blur p-4 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-emerald-400">
              Code Diff Preview
            </h3>
            <input
              type="text"
              className="bg-slate-900 border border-slate-700 text-sm px-2 py-1 rounded-md w-1/2 focus:outline-none focus:border-emerald-500"
              placeholder="File path..."
              value={pendingPath}
              onChange={(e) => setPendingPath(e.target.value)}
            />
          </div>
          <pre className="bg-slate-950 p-3 rounded-md text-xs overflow-auto h-60 border border-slate-800 font-mono">
            {candidateCode || (
              <span className="text-slate-600 italic">
                No candidate changes yet. Generate code first.
              </span>
            )}
          </pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowApprove(true)}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!candidateCode}
            >
              Review & Approve
            </button>
            <button
              onClick={handleCodeReview}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!candidateCode || isReviewing}
              title="Run AI code review"
            >
              {isReviewing ? "🔍 Reviewing..." : "🔍 AI Review"}
            </button>
            <button
              onClick={handlePreCommitReview}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              disabled={!candidateCode || isReviewing}
              title="Review and create PR"
            >
              Create PR
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur p-4 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-400">Runner Output</h3>
            <button
              onClick={runTests}
              className="text-sm px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors"
            >
              ▶ Run npm test
            </button>
          </div>
          <pre className="bg-slate-950 p-3 rounded-md text-xs overflow-auto h-60 border border-slate-800 font-mono">
            {runnerLogs.length === 0 && (
              <span className="text-slate-600 italic">
                No logs yet. Execute a command to see output.
              </span>
            )}
            {runnerLogs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.type === "error"
                    ? "text-rose-400"
                    : log.type === "stderr"
                    ? "text-amber-400"
                    : "text-emerald-300"
                }
              >
                {log.data}
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      <SuggestionPanel
        filePath={pendingPath}
        code={candidateCode}
        backendUrl={backendUrl}
        onApplySuggestion={handleApplySuggestion}
      />

      {showApprove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg w-full max-w-2xl space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold text-emerald-400">
              Approve Generated Changes
            </h2>
            <p className="text-sm text-slate-400">
              Review the proposed update for{" "}
              <span className="text-emerald-300 font-mono">{pendingPath}</span>.
              Approving will write directly to the sandbox.
            </p>
            <pre className="bg-slate-950 border border-slate-800 rounded-md p-4 text-xs h-80 overflow-auto font-mono">
              {candidateCode}
            </pre>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                onClick={() => setShowApprove(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md font-medium transition-colors"
                onClick={approveChanges}
              >
                ✓ Approve & Write
              </button>
            </div>
          </div>
        </div>
      )}

      {showGitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg w-full max-w-lg space-y-4 shadow-2xl">
            <h2 className="text-xl font-semibold text-purple-400">
              Create Pull Request
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-md text-sm focus:outline-none focus:border-purple-500"
                placeholder="Branch name (e.g., feature/new-code)"
                value={gitOptions.branchName}
                onChange={(e) =>
                  setGitOptions({ ...gitOptions, branchName: e.target.value })
                }
              />
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-md text-sm focus:outline-none focus:border-purple-500"
                placeholder="Commit message"
                value={gitOptions.commitMessage}
                onChange={(e) =>
                  setGitOptions({
                    ...gitOptions,
                    commitMessage: e.target.value,
                  })
                }
              />
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-md text-sm focus:outline-none focus:border-purple-500"
                placeholder="PR title"
                value={gitOptions.prTitle}
                onChange={(e) =>
                  setGitOptions({ ...gitOptions, prTitle: e.target.value })
                }
              />
              <textarea
                className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-md text-sm focus:outline-none focus:border-purple-500 h-24 resize-none"
                placeholder="PR description"
                value={gitOptions.prBody}
                onChange={(e) =>
                  setGitOptions({ ...gitOptions, prBody: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                onClick={() => setShowGitModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-medium transition-colors"
                onClick={handleGitWorkflow}
              >
                Create PR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Review Modal */}
      <CodeReviewModal
        isOpen={showCodeReview}
        onClose={() => setShowCodeReview(false)}
        reviewData={reviewData}
        onApplyRefactoring={handleApplyRefactoring}
        isLoading={isLoading}
      />

      {/* Metrics Panel */}
      <MetricsPanel
        isOpen={showMetrics}
        onClose={() => setShowMetrics(false)}
        currentFilePath={pendingPath}
        projectPath="/media/usama_ijaz/Data/Data/Hackathons/IBM_Watson_Orchestrate_Nov/CodeEcho-main"
      />

      {/* Test Management Panel */}
      <TestManagementPanel
        isOpen={showTestPanel}
        onClose={() => setShowTestPanel(false)}
        currentFilePath={pendingPath}
        projectPath={projectPath}
      />

      {/* Project Health Dashboard */}
      {showHealthDashboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-emerald-400">
                📊 Project Health Dashboard
              </h2>
              <button
                onClick={() => setShowHealthDashboard(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6">
              <ProjectHealthDashboard
                projectPath={projectPath}
                onFileClick={handleHealthDashboardFileClick}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
